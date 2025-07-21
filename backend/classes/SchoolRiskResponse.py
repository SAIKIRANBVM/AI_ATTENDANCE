from pydantic import BaseModel, Field
from typing import List
from backend.classes.RiskLevel import RiskLevel
from backend.classes.SchoolRiskItem import SchoolRiskItem
    
    
class SchoolRiskResponse(BaseModel):
    schools: List[SchoolRiskItem] = []
    total_students: int = 0
    average_risk: float = Field(0.0, ge=0, le=100)
    average_risk_level: RiskLevel = Field(..., description="Overall risk level based on average risk percentage")
    risk_distribution: dict[RiskLevel, int] = Field(
        default_factory=dict,
        description="Count of schools in each risk level"
    )
