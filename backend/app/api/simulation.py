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
    for i, t in enumerate(times_min):
        frame_critical_wards = {}
        if grid.ward_mask is not None:
            # RISK_SEVERE = 2, RISK_CRITICAL = 3
            critical_cells_mask = res["risk_frames"][i] >= 2
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
            critical_wards=frame_critical_wards if frame_critical_wards else None
        )
        frames.append(frame)
        
    # Evaluate earliest failure state constraints natively rejecting NaN overrides safely
    ttc_array = res["time_to_critical"]
    ttc_valid = ttc_array[~np.isnan(ttc_array)]
    
    first_critical_min = None
    if len(ttc_valid) > 0:
        first_critical_min = float(np.min(ttc_valid)) * 60.0
        
    critical_wards = frames[-1].critical_wards if frames else None
                
    summary = SimulationSummary(
        max_depth_m=round(res["summary_statistics"]["max_depth"], 4),
        critical_cells=res["summary_statistics"]["num_critical_cells"],
        time_to_first_critical_minutes=round(first_critical_min, 2) if first_critical_min is not None else None,
        critical_wards=critical_wards if critical_wards else None
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
