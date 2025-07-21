from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class RiskLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class SchoolRiskItem(BaseModel):
    school_id: str
    school_name: str
    risk_percentage: float = Field(..., ge=0, le=100)
    student_count: int
    risk_level: RiskLevel = Field(..., description="Risk level based on risk percentage")
    
    @classmethod
    def calculate_risk_level(cls, risk_percentage: float) -> 'RiskLevel':
        """Determine risk level based on risk percentage."""
        if risk_percentage >= 75:
            return RiskLevel.CRITICAL
        elif risk_percentage >= 50:
            return RiskLevel.HIGH
        elif risk_percentage >= 30:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW
    
class SchoolRiskResponse(BaseModel):
    schools: List[SchoolRiskItem] = []
    total_students: int = 0
    average_risk: float = Field(0.0, ge=0, le=100)
    average_risk_level: RiskLevel = Field(..., description="Overall risk level based on average risk percentage")
    risk_distribution: dict[RiskLevel, int] = Field(
        default_factory=dict,
        description="Count of schools in each risk level"
    )
