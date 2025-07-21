from pydantic import BaseModel, Field
from typing import List, Dict
from backend.classes.RiskLevel import RiskLevel
from backend.classes.GradeRiskItem import GradeRiskItem
    
    
class GradeRiskResponse(BaseModel):
    grades: List[GradeRiskItem] = []
    total_students: int = 0
    average_risk: float = Field(0.0, ge=0, le=100)
    average_risk_level: RiskLevel = Field(..., description="Overall risk level based on average risk percentage")
    risk_distribution: Dict[RiskLevel, int] = Field(
        default_factory=dict,
        description="Count of grades in each risk level"
    )
