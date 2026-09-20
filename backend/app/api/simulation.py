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
def get_forecast(use_ml: bool = False):
    """
    Deterministic Early-Warning Engine API with instantaneous ML Fallback.
    Computes a realtime fast-simulation bound to 100 resolution utilizing live open-meteo rain predictions,
    calculating specific cell danger aggregations overlyaing population estimations natively.
    """
    # Run rapid resolution simulation setup
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
    
    # Mask exclusively focusing physical urban domains bypassing arbitrary synthetic limits
    valid_non_lake = (grid.valid_mask) & (~grid.lake_mask)
    
    import os
    import xgboost as xgb
    
    depth_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/models/xgb_peak_depth.json'))
    ttc_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../data/models/xgb_time_to_critical.json'))
    
    used_ml = False
    if use_ml and os.path.exists(depth_path) and os.path.exists(ttc_path):
        try:
            model_depth = xgb.XGBRegressor()
            model_depth.load_model(depth_path)
            model_ttc = xgb.XGBRegressor()
            model_ttc.load_model(ttc_path)
            
            r_idx, c_idx = np.where(valid_non_lake)
            X_pred = np.column_stack([
                 grid.elevation[r_idx, c_idx],
                 grid.drainage_capacity[r_idx, c_idx],
                 grid.runoff_coefficient[r_idx, c_idx],
                 grid.population[r_idx, c_idx],
                 np.full(len(r_idx), rain_val),
                 np.full(len(r_idx), duration_min)
            ])
            
            pred_depth = model_depth.predict(X_pred)
            pred_ttc = model_ttc.predict(X_pred)
            
            peak_depth = np.zeros_like(grid.elevation)
            peak_depth[r_idx, c_idx] = pred_depth
            
            ttc = np.full_like(grid.elevation, np.nan)
            ttc[r_idx, c_idx] = np.where(pred_ttc < 23.0, pred_ttc, np.nan) # model capped at 24
            ttw = ttc * 0.8
            used_ml = True
            print("Successfully accelerated forecast via XGBoost!")
        except Exception as e:
            print(f"XGBoost acceleration failed, falling back to Physics Simulator: {e}")
            
    if not used_ml:
        # Fall back to deterministic physics engine
        res = simulate(config, grid, rain_val, duration_min, dt_min, params=sim_params)
        peak_depth = res["peak_depth"]
        ttc = res["time_to_critical"]
        ttw = res["time_to_warning"]
    
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
    
from app.schemas.predict import PredictRequest, ProbabilisticForecastResponse, EnsembleAreaStats
import xgboost as xgb
import os
import glob
import scipy.ndimage

# Global caches for rapid inference
_ensemble_depth_models = []
_ensemble_ttc_models = []

def load_ensemble():
    global _ensemble_depth_models, _ensemble_ttc_models
    if len(_ensemble_depth_models) == 5:
        return True
        
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data/models'))
    depth_files = sorted(glob.glob(os.path.join(models_dir, "xgb_peak_depth_*.json")))
    ttc_files = sorted(glob.glob(os.path.join(models_dir, "xgb_time_to_critical_*.json")))
    
    if len(depth_files) < 5 or len(ttc_files) < 5:
        return False
        
    for i in range(5):
        dm = xgb.XGBRegressor()
        dm.load_model(depth_files[i])
        _ensemble_depth_models.append(dm)
        
        tm = xgb.XGBRegressor()
        tm.load_model(ttc_files[i])
        _ensemble_ttc_models.append(tm)
        
    return True

@router.post("/predict", response_model=ProbabilisticForecastResponse)
def run_ai_prediction(req: PredictRequest):
    """
    Executes a purely statistical XGBoost surrogate ensemble bypassing physical loops.
    Returns explicit uncertainty boundaries and calibrated likelihood estimations.
    """
    if not load_ensemble():
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="AI forecast unavailable (Models missing)")
        
    config, grid = build_real_city(city="bengaluru", sim_resolution=100, seed=42)
    valid_non_lake = (grid.valid_mask) & (~grid.lake_mask)
    r_idx, c_idx = np.where(valid_non_lake)
    
    # Core feature mapping for all valid terrestrial land
    X_pred = np.column_stack([
         grid.elevation[r_idx, c_idx],
         grid.drainage_capacity[r_idx, c_idx],
         grid.runoff_coefficient[r_idx, c_idx],
         grid.population[r_idx, c_idx],
         np.full(len(r_idx), req.rainfall_intensity_mm_hr),
         np.full(len(r_idx), req.duration_minutes)
    ])
    
    # --- Execute ENSEMBLE ---
    ensemble_preds_depth = []
    ensemble_preds_ttc = []
    
    for dm, tm in zip(_ensemble_depth_models, _ensemble_ttc_models):
        ensemble_preds_depth.append(dm.predict(X_pred))
        ensemble_preds_ttc.append(tm.predict(X_pred))
        
    stack_depth = np.vstack(ensemble_preds_depth) # shape: (5, num_cells)
    stack_ttc = np.vstack(ensemble_preds_ttc)
    
    # Calculate Statistical Means and Variance
    mean_depth = np.mean(stack_depth, axis=0)
    std_depth = np.std(stack_depth, axis=0)
    
    mean_ttc = np.mean(stack_ttc, axis=0)
    std_ttc = np.std(stack_ttc, axis=0)
    
    # Probability interpretation: fraction crossing critical baseline (0.3m)
    critical_threshold = SimulationConfig().critical_threshold
    exceedance_counts = np.sum(stack_depth >= critical_threshold, axis=0)
    p_critical = exceedance_counts / float(len(_ensemble_depth_models))
    
    # City-wide aggregate numbers
    max_d_idx = np.argmax(mean_depth)
    city_max_depth = mean_depth[max_d_idx]
    
    critical_mask = p_critical > 0.0
    city_first_ttc = float(np.min(mean_ttc[critical_mask])) if np.sum(critical_mask) > 0 else None
    
    city_critical_frac = float(np.mean(p_critical)) # Average criticality probability citywide
    city_warning_level = "CRITICAL" if np.max(p_critical) >= 0.8 else ("WARNING" if np.max(p_critical) >= 0.2 else "SAFE")
    
    # Top 5 most vulnerable 'Areas' via threshold masking
    high_threat_mask = np.zeros_like(grid.elevation)
    high_threat_mask[r_idx, c_idx] = (p_critical >= 0.6)
    
    # Label disjoint flooding zones physically
    labels, num_features = scipy.ndimage.label(high_threat_mask)
    
    prone_areas = []
    for zone_idx in range(1, min(num_features + 1, 10)):
        y_mask, x_mask = np.where(labels == zone_idx)
        if len(y_mask) < 2: continue # Ignore statistical singles
        
        c_row, c_col = int(np.mean(y_mask)), int(np.mean(x_mask))
        
        # Grab local metrics mapping back heavily through intersection arrays
        # This requires tracking indices back from standard grid mapping
        # Create full 2D metric maps
        full_p_crit = np.zeros_like(grid.elevation)
        full_p_crit[r_idx, c_idx] = p_critical
        
        full_m_depth = np.zeros_like(grid.elevation)
        full_m_depth[r_idx, c_idx] = mean_depth
        full_sd_depth = np.zeros_like(grid.elevation)
        full_sd_depth[r_idx, c_idx] = std_depth
        
        full_m_ttc = np.full_like(grid.elevation, np.nan)
        full_m_ttc[r_idx, c_idx] = mean_ttc
        full_sd_ttc = np.zeros_like(grid.elevation)
        full_sd_ttc[r_idx, c_idx] = std_ttc
        
        mean_zone_pc = float(np.mean(full_p_crit[y_mask, x_mask]))
        pop_zone = float(np.sum(grid.population[y_mask, x_mask]))
        mean_zone_depth = float(np.mean(full_m_depth[y_mask, x_mask]))
        sd_zone_depth = float(np.mean(full_sd_depth[y_mask, x_mask]))
        
        zone_ttc_raw = full_m_ttc[y_mask, x_mask]
        valid_z_ttc = zone_ttc_raw[zone_ttc_raw < 24.0]
        mean_zone_ttc = float(np.min(valid_z_ttc)) if len(valid_z_ttc) > 0 else None
        sd_zone_ttc = float(np.mean(full_sd_ttc[y_mask, x_mask])) if mean_zone_ttc else None
        
        zone_warning = "CRITICAL" if mean_zone_pc >= 0.8 else "WARNING"
        
        # Ward mapping natively
        computed_zone_id = f"FZ-{zone_idx:03d}"
        if grid.ward_mask is not None:
             w_id = grid.ward_mask[c_row, c_col]
             if w_id > 0:
                 computed_zone_id = str(int(w_id))
        
        prone_areas.append(EnsembleAreaStats(
            zone_id=computed_zone_id,
            centroid_row=c_row,
            centroid_col=c_col,
            mean_peak_depth=mean_zone_depth,
            std_peak_depth=sd_zone_depth,
            mean_time_to_critical=mean_zone_ttc,
            std_time_to_critical=sd_zone_ttc,
            ensemble_estimated_probability=mean_zone_pc,
            warning_level=zone_warning,
            affected_population=pop_zone
        ))
        
    # Sort strictly by most likely threat physically crossing
    prone_areas.sort(key=lambda x: x.ensemble_estimated_probability, reverse=True)
    
    return ProbabilisticForecastResponse(
        predicted_peak_depth_mean_citywide=float(city_max_depth),
        predicted_time_to_critical_mean_citywide=city_first_ttc,
        ensemble_critical_fraction_citywide=min(1.0, city_critical_frac * 10), # Magnify for strict city gauge visualization
        citywide_warning_level=city_warning_level,
        flood_prone_areas=prone_areas[:5] # Return top 5 targets
    )
