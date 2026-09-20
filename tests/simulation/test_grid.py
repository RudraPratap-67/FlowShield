import unittest
import numpy as np
import sys
import os

# Add backend to path so we can import app directly without module resolution issues
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))

from app.simulation.grid import build_synthetic_city, validate_grid, TerrainGrid

class TestGrid(unittest.TestCase):
    def test_build_synthetic_city_basic(self):
        width, height = 100, 100
        config, grid = build_synthetic_city(width, height, seed=42)
        
        self.assertEqual(config.width, width)
        self.assertEqual(config.height, height)
        
        # Validate array dimensions
        self.assertEqual(grid.elevation.shape, (height, width))
        self.assertEqual(grid.drainage_capacity.shape, (height, width))
        
    def test_validate_grid_success(self):
        config, grid = build_synthetic_city(50, 50, seed=123)
        # Should not raise exception
        validate_grid(grid)
        self.assertTrue(True)

    def test_validate_grid_no_nans(self):
        config, grid = build_synthetic_city(10, 10)
        grid.elevation[0, 0] = np.nan
        with self.assertRaisesRegex(ValueError, "NaN values detected"):
            validate_grid(grid)

    def test_validate_grid_finite_elevation(self):
        config, grid = build_synthetic_city(10, 10)
        grid.elevation[5, 5] = np.inf
        with self.assertRaisesRegex(ValueError, "Elevation contains infinite values"):
            validate_grid(grid)

    def test_validate_grid_runoff_bounds(self):
        config, grid = build_synthetic_city(10, 10)
        grid.runoff_coefficient[1, 1] = 1.5
        with self.assertRaisesRegex(ValueError, "Runoff coefficients must be within"):
            validate_grid(grid)
            
        grid.runoff_coefficient[1, 1] = -0.1
        with self.assertRaisesRegex(ValueError, "Runoff coefficients must be within"):
            validate_grid(grid)

    def test_validate_grid_physics_positivity(self):
        config, grid = build_synthetic_city(10, 10)
        
        grid.drainage_capacity[0, 0] = -1.0
        with self.assertRaisesRegex(ValueError, "Drainage capacity must be non-negative"):
            validate_grid(grid)
            
        grid.drainage_capacity[0, 0] = 0.5  # reset 
        grid.population[3, 3] = -50
        with self.assertRaisesRegex(ValueError, "Population must be non-negative"):
            validate_grid(grid)

    def test_deterministic_output(self):
        c1, g1 = build_synthetic_city(20, 20, seed=777)
        c2, g2 = build_synthetic_city(20, 20, seed=777)
        
        np.testing.assert_array_equal(g1.elevation, g2.elevation)
        np.testing.assert_array_equal(g1.runoff_coefficient, g2.runoff_coefficient)
        np.testing.assert_array_equal(g1.blocked_drain_mask, g2.blocked_drain_mask)
        
    def test_shape_mismatch(self):
        config, grid = build_synthetic_city(20, 20)
        grid.population = np.zeros((10, 10))
        
        with self.assertRaisesRegex(ValueError, "Shape mismatch: population"):
            validate_grid(grid)

if __name__ == '__main__':
    unittest.main()
