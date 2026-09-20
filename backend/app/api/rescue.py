import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel
from app.schemas.rescue import RescuePlan
from app.data.pipeline import build_real_city
from app.simulation.engine import simulate, SimulationConfig
from app.data.rainfall import get_rainfall_pipeline
from app.simulation.rescue import generate_rescue_plan

router = APIRouter()

class RescuePlanRequest(BaseModel):
    available_teams: int
    duration_minutes: float = 120.0
    dt_minutes: float = 3.0
    rainfall_intensity_mm_hr: float = 160.0

@router.post("/plan", response_model=RescuePlan)
def get_rescue_plan(req: RescuePlanRequest):
    # 1. Rebuild the exact scenario configuration
    config, grid = build_real_city(city="bengaluru", sim_resolution=150, seed=42)
    
    sim_params = SimulationConfig()
    
    rain_val = req.rainfall_intensity_mm_hr
    if rain_val < 0:
        try:
            api_forecast = get_rainfall_pipeline("FORECAST", days=1)
            rain_val = float(np.mean(api_forecast.precipitation_mm))
        except:
            rain_val = 25.0
            
    # 2. Re-run simulation natively for fresh state (takes ~2s on numpy)
    res = simulate(
        config, 
        grid, 
        rain_val, 
        req.duration_minutes, 
        req.dt_minutes, 
        params=sim_params
    )
    
    # 3. Feed exact math arrays into Rescue Optimizer
    rescue_plan = generate_rescue_plan(
        available_teams=req.available_teams,
        config=config,
        grid=grid,
        peak_depth=res["peak_depth"],
        risk_level=res["risk_frames"][-1], # Terminal risk level represents worst state
        time_to_critical=res["time_to_critical"]
    )
    
    return rescue_plan
