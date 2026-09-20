import numpy as np
from fastapi import APIRouter
from app.schemas.simulation import (
    SimulationRequest,
    SimulationResponse,
    SimulationFrame,
    FlowField,
    SimulationSummary
)
from app.data.pipeline import build_real_city, build_synthetic_city
from app.simulation.engine import simulate, SimulationConfig
from app.data.rainfall import get_rainfall_pipeline

router = APIRouter()

@router.post("/simulate", response_model=SimulationResponse)
def run_simulation(req: SimulationRequest):
    # 1. Build generic mathematical layout representing the terrain topology bounds
    # Always pull real authentic Bengaluru bounds natively tracking to 150 arrays
    config, grid = build_real_city(city="bengaluru", sim_resolution=150, seed=req.seed)
    
    # 2. Optionally map explicit overriding physical behavior flags
    if req.scenario == "blocked":
        # Force a major infra breakdown where drains everywhere are saturated/closed
        grid.blocked_drain_mask = np.ones((config.height, config.width), dtype=bool)
        
    sim_params = SimulationConfig()
    
    # 2.5 Resolve Rainfall Overrides natively hooking to Live API if prompted
    rain_val = req.rainfall_intensity_mm_hr
    if rain_val < 0:
        steps_req = int(np.ceil(req.duration_minutes / req.dt_minutes))
        # Trigger Live Open-Meteo API payload resolution fetching dynamic weather forecasts
        api_forecast = get_rainfall_pipeline("FORECAST", days=1)
        # Average forecast arrays ensuring pure simulator execution bounds structurally 
        rain_val = float(np.mean(api_forecast.precipitation_mm))
    
    # 3. Trigger raw mathematical solver over constraints directly using N-dim arrays
    res = simulate(
        config, 
        grid, 
        rain_val, 
        req.duration_minutes, 
        req.dt_minutes, 
        params=sim_params
    )
    
    # Extract timestamps safely across float logic mappings
    times_min = [t * 60.0 for t in res["time_array"]]
    
    # Pack heavily compressed 2D matrices efficiently into deeply structured JSON payload
    frames = []
    valid_non_lake = (grid.valid_mask) & (~grid.lake_mask)
    for i, t in enumerate(times_min):
        frame_depth = res["depth_frames"][i]
        frame_risk = res["risk_frames"][i]
        
        f_max_depth = float(np.max(frame_depth))
        f_critical_mask = (frame_risk >= 2) & valid_non_lake
        f_critical_cells = int(np.sum(f_critical_mask))
        
        f_affected_mask = (frame_depth >= sim_params.warning_threshold) & valid_non_lake
        f_affected_population = float(np.sum(grid.population[f_affected_mask]))
        
        frame_critical_wards = {}
        if grid.ward_mask is not None:
            # RISK_SEVERE = 2, RISK_CRITICAL = 3
            critical_cells_mask = frame_risk >= 2
            wards_affected = grid.ward_mask[critical_cells_mask]
            unique_wards, counts = np.unique(wards_affected, return_counts=True)
            for w, c in zip(unique_wards, counts):
                if w > 0:
                    frame_critical_wards[int(w)] = int(c)

        frame = SimulationFrame(
            time_minutes=round(t, 4),
            depth=res["depth_frames"][i].round(4).tolist(),
            risk=res["risk_frames"][i].tolist(),
            flow=FlowField(
                vx=res["flow_fields"]["vx"][i].round(4).tolist(),
                vy=res["flow_fields"]["vy"][i].round(4).tolist()
            ),
            critical_wards=frame_critical_wards if frame_critical_wards else None,
            max_depth_m=round(f_max_depth, 4),
            critical_cells=f_critical_cells,
            affected_population=f_affected_population
        )
        frames.append(frame)
        
    # Evaluate earliest failure state constraints natively rejecting NaN overrides safely
    ttc_array = res["time_to_critical"]
    ttc_valid = ttc_array[~np.isnan(ttc_array)]
    
    first_critical_min = None
    if len(ttc_valid) > 0:
        first_critical_min = float(np.min(ttc_valid)) * 60.0
        
    critical_wards = frames[-1].critical_wards if frames else None
    
    # Add population estimation
    valid_non_lake = (grid.valid_mask) & (~grid.lake_mask)
    affected_mask = (res["peak_depth"] >= sim_params.warning_threshold) & valid_non_lake
    affected_population = float(np.sum(grid.population[affected_mask]))
                
    summary = SimulationSummary(
        max_depth_m=round(res["summary_statistics"]["max_depth"], 4),
        critical_cells=res["summary_statistics"]["num_critical_cells"],
        time_to_first_critical_minutes=round(first_critical_min, 2) if first_critical_min is not None else None,
        critical_wards=critical_wards if critical_wards else None,
        affected_population=affected_population
    )
    
    meta = {
        "width": req.width,
        "height": req.height,
        "dt_minutes": req.dt_minutes,
        "duration_minutes": req.duration_minutes,
        "scenario": req.scenario
    }
    
    return SimulationResponse(
        metadata=meta,
        times_minutes=[round(t, 2) for t in times_min],
        frames=frames,
        summary=summary
    )


from app.schemas.simulation import EarlyWarningResult, VulnerableCell

@router.get("/forecast", response_model=EarlyWarningResult)
def get_forecast():
    """
    Deterministic Early-Warning Engine API.
    Computes a realtime fast-simulation bound to 100 resolution utilizing live open-meteo rain predictions,
    calculating specific cell danger aggregations overlaying population estimations natively.
    """
    # Run rapid resolution simulation
    config, grid = build_real_city(city="bengaluru", sim_resolution=100, seed=42)
    sim_params = SimulationConfig()
    
    # Force live precipitation override bounds natively
    try:
        api_forecast = get_rainfall_pipeline("FORECAST", days=1)
        rain_val = float(np.mean(api_forecast.precipitation_mm))
    except Exception:
        rain_val = 25.0  # Fallback intensity mm/hr
        
    duration_min = 60.0
    dt_min = 5.0
    
    res = simulate(config, grid, rain_val, duration_min, dt_min, params=sim_params)
    
    peak_depth = res["peak_depth"]
    ttc = res["time_to_critical"]
    ttw = res["time_to_warning"]
    
    # Mask exclusively focusing physical urban domains bypassing arbitrary synthetic limits
    valid_non_lake = (grid.valid_mask) & (~grid.lake_mask)
    
    safe_mask = (peak_depth < sim_params.warning_threshold) & valid_non_lake
    safe_cells = int(np.sum(safe_mask))
    
    warning_mask = (peak_depth >= sim_params.warning_threshold) & (peak_depth < sim_params.critical_threshold) & valid_non_lake
    warning_cells = int(np.sum(warning_mask))
    
    critical_mask = (peak_depth >= sim_params.critical_threshold) & valid_non_lake
    critical_cells = int(np.sum(critical_mask))
    
    ttc_valid = ttc[~np.isnan(ttc)]
    first_critical_time_minutes = float(np.min(ttc_valid)) * 60.0 if len(ttc_valid) > 0 else None
    
    # Sort purely by physical peak_depth structurally tracking worst vectors
    sortable_depth = np.where(valid_non_lake, peak_depth, -1.0)
    flat_indices = np.argsort(sortable_depth.flatten())[::-1]
    
    top_cells = []
    most_vulnerable_cell = None
    
    for idx in flat_indices[:10]:
        r, c = divmod(int(idx), config.width)
        d = float(peak_depth[r, c])
        if d <= 0: break
        
        vc = VulnerableCell(
            row=r,
            col=c,
            peak_depth=d,
            time_to_warning=float(ttw[r, c] * 60.0) if not np.isnan(ttw[r, c]) else None,
            time_to_critical=float(ttc[r, c] * 60.0) if not np.isnan(ttc[r, c]) else None,
            population=float(grid.population[r, c])
        )
        top_cells.append(vc)
        if most_vulnerable_cell is None:
            most_vulnerable_cell = vc
            
    # Identify cumulative sum population exposure natively across classified zones
    affected_mask = (peak_depth >= sim_params.warning_threshold) & valid_non_lake
    affected_population = float(np.sum(grid.population[affected_mask]))
    # NOTE: Population Aggregation is strictly an estimate calculated by matching generic demographic grids across active warning bounds.
    
    return EarlyWarningResult(
        safe_cells=safe_cells,
        warning_cells=warning_cells,
        critical_cells=critical_cells,
        first_critical_time_minutes=first_critical_time_minutes,
        most_vulnerable_cell=most_vulnerable_cell,
        top_vulnerable_cells=top_cells,
        affected_population=affected_population
    )
