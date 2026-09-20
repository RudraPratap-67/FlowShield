import time
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
from app.simulation.grid import build_city
from app.simulation.engine import simulate, SimulationConfig
from app.main import app
from fastapi.testclient import TestClient

def run_bench():
    print("--- NATIVE PHYSICS ENGINE ---")
    config, grid = build_city(city="bengaluru", sim_resolution=150, seed=42)
    sim_params = SimulationConfig()
    
    t0 = time.perf_counter()
    res = simulate(config, grid, 50.0, 120.0, 5.0, params=sim_params)
    t1 = time.perf_counter()
    sim_time = t1 - t0
    
    print(f"Grid Dimensions: {config.width}x{config.height}")
    print(f"Number of frames: {len(res['depth_frames'])}")
    print(f"Sim Runtime: {sim_time:.4f} seconds")
    
    print("\n--- API ENDPOINT ---")
    client = TestClient(app)
    
    payload = {
        "width": 50,
        "height": 50,
        "rainfall_intensity_mm_hr": 50.0,
        "duration_minutes": 120.0,
        "dt_minutes": 5.0,
        "scenario": "normal",
        "seed": 42
    }
    
    t0 = time.perf_counter()
    resp = client.post("/api/simulate", json=payload)
    t1 = time.perf_counter()
    api_time = t1 - t0
    
    if resp.status_code == 200:
        data = resp.json()
        payload_bytes = len(json.dumps(data).encode('utf-8'))
        print(f"API Response Time: {api_time:.4f} seconds")
        print(f"Response Payload Size: {payload_bytes / 1024:.2f} KB ({(payload_bytes / 1024 / 1024):.2f} MB)")
    else:
        print(f"API Failed: {resp.status_code} - {resp.text}")

if __name__ == '__main__':
    run_bench()
