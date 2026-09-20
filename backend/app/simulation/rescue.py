import numpy as np
import scipy.ndimage
from typing import Dict, Any, List, Tuple
from app.schemas.rescue import RescueZone, RescueAssignment, RescuePlan
import math

# Default Modeling Weights
WEIGHTS = {
    "population_impact": 0.30,
    "population_density": 0.15,
    "flood_severity": 0.20,
    "urgency": 0.20,
    "travel_accessibility": 0.10,
    "deployment_safety": 0.05,
}

URGENCY_HORIZON_MINUTES = 120.0
WARNING_THRESHOLD_M = 0.15
TEAM_CAPACITY = 2000  # Number of people a team can realistically handle in this context

def coord_to_grid(lat: float, lon: float, config) -> Tuple[int, int]:
    lat_ratio = (lat - config.latitude_min) / (config.latitude_max - config.latitude_min)
    lon_ratio = (lon - config.longitude_min) / (config.longitude_max - config.longitude_min)
    # The grid indexing matches row-major, lat descending or ascending depending on config.
    # Assuming lat_min is bottom, lat_max is top, row index 0 is North.
    row = int((1.0 - lat_ratio) * config.height)
    col = int(lon_ratio * config.width)
    return max(0, min(config.height - 1, row)), max(0, min(config.width - 1, col))

def grid_to_coord(row: int, col: int, config) -> Tuple[float, float]:
    lat_ratio = 1.0 - (row / float(config.height))
    lon_ratio = col / float(config.width)
    lat = config.latitude_min + lat_ratio * (config.latitude_max - config.latitude_min)
    lon = config.longitude_min + lon_ratio * (config.longitude_max - config.longitude_min)
    return lat, lon

def grid_distance(r1, c1, r2, c2, config):
    # Rough haversine approximation for short distances
    lat1, lon1 = grid_to_coord(r1, c1, config)
    lat2, lon2 = grid_to_coord(r2, c2, config)
    
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def generate_rescue_plan(
    available_teams: int,
    grid, 
    peak_depth: np.ndarray,
    risk_level: np.ndarray,
    time_to_critical: np.ndarray
) -> RescuePlan:
    config = grid.config
    
    # 1. IDENTIFY AFFECTED CELLS
    # Binary mask of cells requiring attention
    affected_mask = (peak_depth >= WARNING_THRESHOLD_M) & (grid.population > 0)
    
    # 2. CLUSTER AFFECTED AREAS
    # Find spatial clusters
    labeled_array, num_features = scipy.ndimage.label(affected_mask)
    
    zones: List[RescueZone] = []
    
    max_overall_pop = 1.0 # to avoid div/0
    max_overall_density = 1.0
    max_overall_depth = 1.0
    
    cluster_indices = {}
    
    for cluster_id in range(1, num_features + 1):
        # Extract cluster cells
        row_indices, col_indices = np.where(labeled_array == cluster_id)
        if len(row_indices) < 2:
            continue # ignore single isolated noise cells
            
        cluster_indices[cluster_id] = (row_indices, col_indices)
        
        pop = np.sum(grid.population[row_indices, col_indices])
        if pop <= 0:
            continue
            
        area_km2 = len(row_indices) * (config.cell_size_m / 1000.0)**2
        density = pop / area_km2 if area_km2 > 0 else 0
        
        c_depths = peak_depth[row_indices, col_indices]
        c_max_depth = np.max(c_depths)
        c_mean_depth = np.mean(c_depths)
        
        c_ttc = time_to_critical[row_indices, col_indices]
        valid_ttc = c_ttc[c_ttc < 9999]
        min_ttc = np.min(valid_ttc) if len(valid_ttc) > 0 else URGENCY_HORIZON_MINUTES
        
        max_risk = np.max(risk_level[row_indices, col_indices])
        
        # Center of mass calculation
        mean_row = int(np.round(np.mean(row_indices)))
        mean_col = int(np.round(np.mean(col_indices)))
        centroid_lat, centroid_lon = grid_to_coord(mean_row, mean_col, config)
        
        # Danger / Accessibility
        # Danger increases with depth and risk
        danger_sc = (c_max_depth / 2.0) + (max_risk / 2.0)
        danger_sc = min(1.0, max(0.0, danger_sc))
        
        # Accessibility roughly depends on proximity to safe zones. 
        # Using a simplified 0.5 static or grid dependent for now.
        access_sc = 0.8
        
        # Track maximums for normalization
        max_overall_pop = max(max_overall_pop, pop)
        max_overall_density = max(max_overall_density, density)
        max_overall_depth = max(max_overall_depth, c_max_depth)
        
        zones.append({
            "_internal_obj": cluster_id,
            "zone_id": f"RZ-{(cluster_id):03d}",
            "centroid_row": mean_row,
            "centroid_col": mean_col,
            "centroid_lat": centroid_lat,
            "centroid_lon": centroid_lon,
            "affected_population": pop,
            "population_density": density,
            "max_depth": float(c_max_depth),
            "mean_depth": float(c_mean_depth),
            "risk_level": "CRITICAL" if max_risk == 2 else ("WARNING" if max_risk == 1 else "SAFE"),
            "time_to_critical": float(min_ttc),
            "danger_score": float(danger_sc),
            "accessibility_score": float(access_sc),
            # Set iteratively later
            "urgency_score": 0.0,
            "priority_score": 0.0,
            "recommended_deployment_lat": centroid_lat,
            "recommended_deployment_lon": centroid_lon,
            "recommended_deployment_row": mean_row,
            "recommended_deployment_col": mean_col,
        })
        
    # 3. NORMALIZE AND SCORE ZONES
    for zone in zones:
        # Urgency
        urgency = 1.0 - max(0.0, min(1.0, zone["time_to_critical"] / URGENCY_HORIZON_MINUTES))
        
        # Normalization
        norm_pop = zone["affected_population"] / max_overall_pop
        norm_dens = zone["population_density"] / max_overall_density
        norm_sev = zone["max_depth"] / max_overall_depth
        
        priority = (
            norm_pop * WEIGHTS["population_impact"] +
            norm_dens * WEIGHTS["population_density"] +
            norm_sev * WEIGHTS["flood_severity"] +
            urgency * WEIGHTS["urgency"] +
            zone["accessibility_score"] * WEIGHTS["travel_accessibility"] -
            zone["danger_score"] * WEIGHTS["deployment_safety"] # Safety reduces direct zone priority slightly
        )
        
        zone["urgency_score"] = float(urgency)
        zone["priority_score"] = float(priority)
        
    # Sort zones by priority
    zones.sort(key=lambda x: x["priority_score"], reverse=True)
    
    # 4. FIND SAFE DEPLOYMENT LOCATIONS
    # Instead of dropping the team strictly on the centroid (which is under water), find nearby dry land
    for zone in zones:
        crow, ccol = zone["centroid_row"], zone["centroid_col"]
        
        search_radius = 15 # cells
        best_deploy_rc = (crow, ccol)
        min_penalty = float('inf')
        
        r_min, r_max = max(0, crow - search_radius), min(config.height, crow + search_radius + 1)
        c_min, c_max = max(0, ccol - search_radius), min(config.width, ccol + search_radius + 1)
        
        # Extract subgrids for fast search
        sub_depth = peak_depth[r_min:r_max, c_min:c_max]
        sub_elev = grid.elevation[r_min:r_max, c_min:c_max]
        
        for r in range(r_min, r_max):
            for c in range(c_min, c_max):
                r_idx, c_idx = r - r_min, c - c_min
                d = sub_depth[r_idx, c_idx]
                e = sub_elev[r_idx, c_idx]
                
                # We want dry land (d < 0.05), high elevation, relatively close
                if d < 0.1:
                    dist = math.sqrt((r - crow)**2 + (c - ccol)**2)
                    penalty = dist * 2.0 - e * 0.1 + d * 50.0  # Encourage low dist, high elev, zero depth
                    if penalty < min_penalty:
                        min_penalty = penalty
                        best_deploy_rc = (r, c)
                        
        zone["recommended_deployment_row"], zone["recommended_deployment_col"] = best_deploy_rc
        zone["recommended_deployment_lat"], zone["recommended_deployment_lon"] = grid_to_coord(best_deploy_rc[0], best_deploy_rc[1], config)

    # 5. GREEDY LIMITED ALLOCATION
    assignments: List[RescueAssignment] = []
    uncovered_zones = []
    teams_allocated = 0
    assigned_zone_ids = set()
    
    total_population_covered = 0.0
    
    for zone in zones:
        if teams_allocated >= available_teams:
            uncovered_zones.append(zone)
            continue
            
        if zone["zone_id"] in assigned_zone_ids:
            continue
            
        # Is there already an assignment incredibly close that can cover this?
        # Check team capacity remaining (simplified greedy)
        covered_by_existing = False
        for a in assignments:
            dist = grid_distance(zone["recommended_deployment_row"], zone["recommended_deployment_col"], a.deployment_lat, a.deployment_lon, config) # wait lat lon is not rc
            # Use real distance
            dist_km = grid_distance(zone["recommended_deployment_row"], zone["recommended_deployment_col"], 
                                    int((1.0 - (a.deployment_lat - config.latitude_min)/(config.latitude_max - config.latitude_min)) * config.height),
                                    int(((a.deployment_lon - config.longitude_min)/(config.longitude_max - config.longitude_min)) * config.width), config)
            if dist_km < 1.0 and a.estimated_affected_population < TEAM_CAPACITY:
                # Add to existing team
                a.estimated_affected_population += min(zone["affected_population"], TEAM_CAPACITY - a.estimated_affected_population)
                assigned_zone_ids.add(zone["zone_id"])
                covered_by_existing = True
                break
                
        if covered_by_existing:
            continue
            
        # Allocate new team
        teams_allocated += 1
        assigned_zone_ids.add(zone["zone_id"])
        
        dist_to_centroid_km = grid_distance(zone["centroid_row"], zone["centroid_col"], 
                                            zone["recommended_deployment_row"], zone["recommended_deployment_col"], config)
                                            
        deploy_d = peak_depth[zone["recommended_deployment_row"], zone["recommended_deployment_col"]]
        safety_score = 1.0 - (deploy_d / 0.5)
        safety_score = max(0.0, min(1.0, safety_score))
        
        pop_handled = min(zone["affected_population"], TEAM_CAPACITY * 1.5)
        total_population_covered += pop_handled
        
        reason = f"High affected population ({int(zone['affected_population'])}). "
        if zone["time_to_critical"] < 30:
            reason += "Extremely short time to critical event. "
        reason += f"Deployment point secured on nearby terrain {dist_to_centroid_km:.1f}km from centroid."
        
        assignment = RescueAssignment(
            team_id=f"T-{teams_allocated:02d}",
            zone_id=zone["zone_id"],
            deployment_lat=zone["recommended_deployment_lat"],
            deployment_lon=zone["recommended_deployment_lon"],
            estimated_travel_distance_km=round(dist_to_centroid_km, 2),
            estimated_affected_population=round(pop_handled),
            priority_score=round(zone["priority_score"], 3),
            deployment_safety_score=round(safety_score, 2),
            reason=reason
        )
        assignments.append(assignment)

    # Convert zone dicts to proper schemas
    final_uncovered = []
    for z in uncovered_zones:
        final_uncovered.append(RescueZone(**z))

    return RescuePlan(
        available_teams=available_teams,
        teams_assigned=teams_allocated,
        unassigned_high_priority_zones=len(uncovered_zones),
        total_population_covered=round(total_population_covered),
        assignments=assignments,
        uncovered_zones=final_uncovered,
        assumptions=[
            f"Each team handles up to {TEAM_CAPACITY} people.",
            "Distance is straight-line Euclidean (road networks not applied).",
            "Urgency maxes at 120 minutes.",
            "This is a decision-support module, not official deployment software."
        ]
    )
