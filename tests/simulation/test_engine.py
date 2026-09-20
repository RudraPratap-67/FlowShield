import unittest
import numpy as np
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))

from app.simulation.grid import GridConfig, TerrainGrid
from app.simulation.engine import simulate, SimulationConfig, RISK_SAFE, RISK_CRITICAL

def build_flat_terrain(w, h, depth=0.0):
    return TerrainGrid(
        elevation=np.zeros((h, w)),
        drainage_capacity=np.zeros((h, w)),
        runoff_coefficient=np.ones((h, w)),
        initial_water_depth=np.full((h, w), depth),
        lake_mask=np.zeros((h, w), dtype=bool),
        blocked_drain_mask=np.zeros((h, w), dtype=bool),
        population=np.zeros((h, w)),
        valid_mask=np.ones((h, w), dtype=bool)
    )

class TestEngine(unittest.TestCase):
    def test_no_rainfall_no_water_appearance(self):
        grid = build_flat_terrain(10, 10, depth=0.0)
        config = GridConfig(10, 10, 0, 1, 0, 1, 50.0)
        res = simulate(config, grid, 0.0, 60, 5)
        self.assertEqual(res["summary_statistics"]["max_depth"], 0.0)
        self.assertLess(res["mass_balance"]["residual"], 1e-9)

    def test_flat_terrain_no_directional_movement(self):
        grid = build_flat_terrain(10, 10, depth=0.5)
        config = GridConfig(10, 10, 0, 1, 0, 1, 50.0)
        # Only simulate 1 step so boundary loss wave doesn't reach the middle yet
        res = simulate(config, grid, 0.0, 5, 5)
        v_mag_sum = np.sum(res["flow_fields"]["magnitude"][-1])
        # Only boundary cells should move outwards since boundaries are open!
        # Middle cells should not have water movement.
        middle_v_mag = np.sum(res["flow_fields"]["magnitude"][-1][2:-2, 2:-2])
        self.assertAlmostEqual(middle_v_mag, 0.0, places=5)

    def test_downhill_flow(self):
        grid = build_flat_terrain(3, 3, depth=0.0)
        config = GridConfig(3, 3, 0, 1, 0, 1, 50.0)
        # Center high
        grid.elevation[1, 1] = 10.0
        grid.elevation[1, 2] = 0.0 
        grid.initial_water_depth[1, 1] = 1.0 # Give it water
        
        res = simulate(config, grid, 0.0, 10, 1)
        final_h = res["depth_frames"][-1]
        
        # Center should have deposited water into side neighbors
        self.assertLess(final_h[1, 1], 1.0)
        self.assertGreater(final_h[1, 2], 0.0)

    def test_drainage_behavior(self):
        grid = build_flat_terrain(5, 5, depth=0.2) # 200mm depth
        config = GridConfig(5, 5, 0, 1, 0, 1, 50.0)
        # Set uniform high drainage
        grid.drainage_capacity = np.full((5, 5), 1.0) # 1m per hr
        
        # Sim for 0.1 hr (6 mins), should drain ~ 0.1m
        res = simulate(config, grid, 0.0, 6, 1)
        final_h = res["depth_frames"][-1]
        
        # Check center mass to avoid boundary loss overlap interactions
        self.assertTrue(0.05 < final_h[2, 2] < 0.15)
        
    def test_blocked_drainage(self):
        grid = build_flat_terrain(3, 3, depth=1.0)
        config = GridConfig(3, 3, 0, 1, 0, 1, 50.0)
        grid.drainage_capacity.fill(2.0)
        # Block only the center
        grid.blocked_drain_mask[1, 1] = True
        
        res = simulate(config, grid, 0.0, 5, 1)
        final_h = res["depth_frames"][-1]
        
        # Center cell retains much more water than its identical unblocked edge neighbor
        self.assertGreater(final_h[1, 1], final_h[1, 0])

    def test_mass_conservation_residual(self):
        grid = build_flat_terrain(10, 10, depth=0.5)
        config = GridConfig(10, 10, 0, 1, 0, 1, 50.0)
        grid.drainage_capacity.fill(0.01)
        res = simulate(config, grid, 10.0, 120, 5) # 10mm/hr rain, 2 hrs
        
        # Tolerance heavily strict for continuity conservation
        self.assertLess(abs(res["mass_balance"]["residual"]), 1e-5)

    def test_critical_threshold_classification(self):
        grid = build_flat_terrain(5, 5, depth=0.0)
        config = GridConfig(5, 5, 0, 1, 0, 1, 50.0)
        params = SimulationConfig(critical_threshold=0.3)
        # Pour ton of rain
        res = simulate(config, grid, 500.0, 60, 5, params=params) # 500mm/hr = 0.5m/hr
        
        # After 1 hour, almost all cells without massive boundary drain should be CRITICAL
        self.assertEqual(res["risk_frames"][-1][2, 2], RISK_CRITICAL)

    def test_time_to_critical(self):
        grid = build_flat_terrain(5, 5, depth=0.0)
        config = GridConfig(5, 5, 0, 1, 0, 1, 50.0)
        params = SimulationConfig(critical_threshold=0.2)
        # Rain 0.4 m/hr. Should take 30 mins to hit 0.2m depth (excluding drainage/boundaries)
        # Because we have boundaries, let's test a closed central cell where flow cancels or forms
        res = simulate(config, grid, 400.0, 60, 5, params=params)
        
        ttc = res["time_to_critical"][2, 2]
        self.assertIsNotNone(ttc)
        self.assertFalse(np.isnan(ttc))
        self.assertTrue(0.4 <= ttc <= 0.6) # Roughly around 0.5 hours

    def test_determinism(self):
        grid1 = build_flat_terrain(5, 5, depth=0.1)
        config = GridConfig(5, 5, 0, 1, 0, 1, 50.0)
        res1 = simulate(config, grid1, 10.0, 30, 2)
        
        grid2 = build_flat_terrain(5, 5, depth=0.1)
        res2 = simulate(config, grid2, 10.0, 30, 2)
        
        np.testing.assert_array_equal(res1["depth_frames"][-1], res2["depth_frames"][-1])
        np.testing.assert_array_equal(res1["risk_frames"][-1], res2["risk_frames"][-1])


if __name__ == '__main__':
    unittest.main()
