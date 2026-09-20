from pydantic import BaseModel, Field
from typing import List, Optional

class RescueZone(BaseModel):
    zone_id: str
    centroid_lat: float
    centroid_lon: float
    affected_population: float
    population_density: float
    max_depth: float
    mean_depth: float
    risk_level: str
    time_to_critical: Optional[float] = None
    urgency_score: float
    danger_score: float
    accessibility_score: float
    priority_score: float
    recommended_deployment_lat: float
    recommended_deployment_lon: float

class RescueAssignment(BaseModel):
    team_id: str
    zone_id: str
    deployment_lat: float
    deployment_lon: float
    estimated_travel_distance_km: float
    estimated_affected_population: float
    priority_score: float
    deployment_safety_score: float
    reason: str

class RescuePlan(BaseModel):
    available_teams: int
    teams_assigned: int
    unassigned_high_priority_zones: int
    total_population_covered: float
    assignments: List[RescueAssignment]
    uncovered_zones: List[RescueZone]
    assumptions: List[str]
    model_version: str = "1.0.0"
