import sys
import os

# Append FlowShield Engine properly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.data.pipeline import build_real_city, get_city_data_status
from app.simulation.grid import validate_grid

def verify_city_data():
    print("Beginning Complete Centralized Data Aggregation Tests for Bengaluru...")
    
    # 1. Evaluate Explicit API Bounds reporting
    status = get_city_data_status("bengaluru")
    print(f"REPORTED ACTIVE API DATA STATUS limits: \n{status}\n")
    
    # 2. Architect City limits natively
    print(f"Building TerrainGrid arrays resolving Pipeline limits exactly...")
    try:
        config, grid = build_real_city("bengaluru", sim_resolution=150)
    except Exception as e:
        print(f"FATAL Exception: Extracted array limitations failed natively! {e}")
        sys.exit(1)
        
    print("City Construction limits accurately compiled avoiding execution crashing seamlessly.")
    
    # 3. Assert Explicit Grid properties precisely enforcing bounds!
    try:
        validate_grid(grid)
        print("Mathematical Validation (validate_grid): PASSED. Zero NaN vectors found, No limits violated, Dimension properties identical!")
    except Exception as e:
        print(f"Grid Validation Array Limits constraints violated natively: {e}")
        sys.exit(1)
        
    # Verify strict shape matches matching native constraints safely
    target_shape = (143, 150)
    arrays = [
        ("Elevation", grid.elevation),
        ("Population", grid.population),
        ("Runoff Coefficient", grid.runoff_coefficient),
        ("Drainage Capacity", grid.drainage_capacity),
        ("Valid Mask", grid.valid_mask),
        ("Lake Mask", grid.lake_mask)
    ]
    
    fail = False
    for name, arr in arrays:
        if arr.shape != target_shape:
            print(f"ERROR: Shape mismatch boundary constraint explicitly caught tracking {name}: {arr.shape} != {target_shape}")
            fail = True
            
    if fail:
        sys.exit(1)
        
    print(f"All structural arrays accurately matching {target_shape} seamlessly decoupled mathematically properly!")
    print("SUCCESS: Full City Engine Data Architecture explicitly validated!")

if __name__ == "__main__":
    verify_city_data()
