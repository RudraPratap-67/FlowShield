from fastapi import APIRouter
from typing import Dict, Any

from app.data.pipeline import get_city_data_status

router = APIRouter()

@router.get("/data-status")
def retrieve_city_data_status(city: str = "bengaluru") -> Dict[str, Any]:
    """Retrieves explicitly bounding variables determining FlowShield Data Engine fallback parameters."""
    return get_city_data_status(city)
