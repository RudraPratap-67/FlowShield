from fastapi.testclient import TestClient
import numpy as np
import pytest
from app.main import app
from app.schemas.simulation import EarlyWarningResult

client = TestClient(app)

def test_forecast_early_warning_endpoint():
    """
    Test the robust deterministic execution of the early-warning prediction logic natively directly executing via the /api/forecast endpoint.
    It verifies schema matching and correct physical limits mapped to population limits seamlessly.
    """
    response = client.get("/api/forecast")
    
    assert response.status_code == 200, f"Request failed: {response.text}"
    
    data = response.json()
    assert "safe_cells" in data
    assert "warning_cells" in data
    assert "critical_cells" in data
    assert "affected_population" in data
    assert "top_vulnerable_cells" in data
    
    # Ensure all constraints are non-negative structurally
    assert data["safe_cells"] >= 0
    assert data["warning_cells"] >= 0
    assert data["critical_cells"] >= 0
    assert data["affected_population"] >= 0.0
    
    # Assert ranking is sorted correctly
    if len(data["top_vulnerable_cells"]) > 1:
        cells = data["top_vulnerable_cells"]
        for i in range(len(cells) - 1):
            assert cells[i]["peak_depth"] >= cells[i+1]["peak_depth"]
