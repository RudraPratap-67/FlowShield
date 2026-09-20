from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FlowShield API", description="Flood Simulation & Early Warning Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .simulation.grid import build_synthetic_city, validate_grid
from app.data.pipeline import build_real_city
from .api import simulation, data

app.include_router(simulation.router, prefix="/api", tags=["simulation"])
app.include_router(data.router, prefix="/api", tags=["data"])
from fastapi.staticfiles import StaticFiles
import os

def get_base_dir():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))

app.mount("/api/geojson", StaticFiles(directory=os.path.join(get_base_dir(), "data/raw/bengaluru")), name="geojson")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/terrain")
def get_terrain():
    config, grid = build_real_city(city="bengaluru", sim_resolution=150, seed=42)
    return {
        "config": {
            "width": config.width,
            "height": config.height,
            "latitude_min": config.latitude_min,
            "latitude_max": config.latitude_max,
            "longitude_min": config.longitude_min,
            "longitude_max": config.longitude_max,
            "cell_size_m": config.cell_size_m
        },
        "elevation": grid.elevation.tolist(),
        "lake_mask": grid.lake_mask.tolist(),
        "drainage_capacity": grid.drainage_capacity.tolist(),
        "runoff_coefficient": grid.runoff_coefficient.tolist()
    }

