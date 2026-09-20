from pydantic import BaseModel, ConfigDict, Field
from typing import List, Dict, Optional, Any

class SimulationRequest(BaseModel):
    width: int = Field(60, ge=10, le=200)
    height: int = Field(60, ge=10, le=200)
    rainfall_intensity_mm_hr: float = Field(...)
    duration_minutes: float = Field(..., gt=0.0)
    dt_minutes: float = Field(..., gt=0.0)
    scenario: str = "normal"
    seed: int = 42

class FlowField(BaseModel):
    vx: List[List[float]]
    vy: List[List[float]]

class SimulationFrame(BaseModel):
    time_minutes: float
    depth: List[List[float]]
    risk: List[List[int]]
    flow: FlowField
    critical_wards: Optional[Dict[int, int]] = None
    max_depth_m: Optional[float] = None
    critical_cells: Optional[int] = None
    affected_population: Optional[float] = None

class SimulationSummary(BaseModel):
    max_depth_m: float
    critical_cells: int
    time_to_first_critical_minutes: Optional[float] = None
    critical_wards: Optional[Dict[int, int]] = None
    affected_population: float = 0.0

class VulnerableCell(BaseModel):
    row: int
    col: int
    peak_depth: float
    time_to_warning: Optional[float] = None
    time_to_critical: Optional[float] = None
    population: float = 0.0

class EarlyWarningResult(BaseModel):
    safe_cells: int
    warning_cells: int
    critical_cells: int
    first_critical_time_minutes: Optional[float] = None
    most_vulnerable_cell: Optional[VulnerableCell] = None
    top_vulnerable_cells: List[VulnerableCell] = []
    affected_population: float = 0.0

class SimulationResponse(BaseModel):
    metadata: Dict[str, Any]
    times_minutes: List[float]
    frames: List[SimulationFrame]
    summary: SimulationSummary
