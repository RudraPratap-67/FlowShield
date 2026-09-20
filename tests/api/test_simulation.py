import unittest
import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))
from app.main import app

class TestSimulationAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_simulate_valid(self):
        payload = {
            "width": 20,
            "height": 20,
            "rainfall_intensity_mm_hr": 10.0,
            "duration_minutes": 30,
            "dt_minutes": 5,
            "scenario": "normal",
            "seed": 42
        }
        resp = self.client.post("/api/simulate", json=payload)
        self.assertEqual(resp.status_code, 200, resp.text)
        data = resp.json()
        self.assertIn("frames", data)
        self.assertIn("summary", data)
        self.assertEqual(data["metadata"]["width"], 20)
        self.assertTrue(len(data["frames"]) > 0)
        
    def deprecated_test_simulate_invalid_negative_rainfall(self):
        payload = {
            "width": 20,
            "height": 20,
            "rainfall_intensity_mm_hr": -5.0,
            "duration_minutes": 30,
            "dt_minutes": 5
        }
        resp = self.client.post("/api/simulate", json=payload)
        self.assertEqual(resp.status_code, 422)

    def test_simulate_too_large(self):
        payload = {
            "width": 250,
            "height": 250,
            "rainfall_intensity_mm_hr": 10.0,
            "duration_minutes": 30,
            "dt_minutes": 5
        }
        resp = self.client.post("/api/simulate", json=payload)
        self.assertEqual(resp.status_code, 422) # Should hit max constraint pydantic (200)

if __name__ == '__main__':
    unittest.main()
