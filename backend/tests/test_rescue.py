import pytest
import numpy as np
from app.simulation.rescue import generate_rescue_plan, RescuePlan
from app.schemas.rescue import RescueZone

class MockConfig:
    width = 50
    height = 50
    latitude_min = 12.9
    latitude_max = 13.0
    longitude_min = 77.5
    longitude_max = 77.6
    cell_size_m = 100

class MockGrid:
    def __init__(self):
        self.config = MockConfig()
        self.population = np.zeros((50, 50))
        self.elevation = np.ones((50, 50)) * 900
        
def test_rescue_allocation_limits():
    grid = MockGrid()
    # Create two disconnected flood zones
    # Zone 1
    grid.population[10:15, 10:15] = 100
    # Zone 2
    grid.population[30:35, 30:35] = 500 # higher pop, higher priority
    
    peak_depth = np.zeros((50, 50))
    peak_depth[10:15, 10:15] = 0.5
    peak_depth[30:35, 30:35] = 0.8
    
    risk_level = np.zeros((50, 50))
    risk_level[10:15, 10:15] = 2
    risk_level[30:35, 30:35] = 2
    
    time_to_critical = np.ones((50, 50)) * 120
    time_to_critical[30:35, 30:35] = 10 # very urgent
    
    # Test 1 team available
    plan_1 = generate_rescue_plan(1, grid, peak_depth, risk_level, time_to_critical)
    assert plan_1.teams_assigned == 1
    assert len(plan_1.assignments) == 1
    assert plan_1.unassigned_high_priority_zones == 1
    
    # The assigned zone should be Zone 2 (higher pop, higher severity, higher urgency)
    assert plan_1.assignments[0].estimated_affected_population == 3000 # Capped at 1.5x TEAM_CAPACITY (2000)
    
    # Test 5 teams available
    plan_5 = generate_rescue_plan(5, grid, peak_depth, risk_level, time_to_critical)
    assert plan_5.teams_assigned == 2 # Only 2 zones exist!
    assert len(plan_5.assignments) == 2
    assert plan_5.unassigned_high_priority_zones == 0

def test_no_affected_zones():
    grid = MockGrid()
    peak_depth = np.zeros((50, 50)) # Nothing flooded
    risk_level = np.zeros((50, 50))
    time_to_critical = np.ones((50, 50)) * 9999
    
    plan = generate_rescue_plan(5, grid, peak_depth, risk_level, time_to_critical)
    assert plan.teams_assigned == 0
    assert len(plan.assignments) == 0
    assert plan.unassigned_high_priority_zones == 0

def test_deployment_safety():
    grid = MockGrid()
    grid.population[20:30, 20:30] = 100
    # Center is deeply flooded
    peak_depth = np.ones((50, 50)) * 0.01 # background
    peak_depth[20:30, 20:30] = 5.0 # extreme depth, do not deploy here!
    # Safe edge
    peak_depth[18:20, 20:30] = 0.0
    
    risk_level = np.zeros((50, 50))
    time_to_critical = np.ones((50, 50)) * 60
    
    plan = generate_rescue_plan(2, grid, peak_depth, risk_level, time_to_critical)
    
    assert len(plan.assignments) == 1
    # Check that deployment coords are not in the heavily flooded region
    deploy_row = plan.uncovered_zones[0].recommended_deployment_row if plan.uncovered_zones else None
    if len(plan.assignments) > 0:
        a = plan.assignments[0]
        # Calculate row mapping roughly
        d_lat = a.deployment_lat
        lat_ratio = (d_lat - grid.config.latitude_min) / (grid.config.latitude_max - grid.config.latitude_min)
        row = int((1.0 - lat_ratio) * grid.config.height)
        
        # Deployment row shouldn't be inside the deep water [20:30]
        assert row < 20 or row > 30 or peak_depth[row, 25] < 0.1
