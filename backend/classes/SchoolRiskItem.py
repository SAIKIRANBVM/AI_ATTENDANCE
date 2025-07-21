from pydantic import BaseModel, Field
from backend.classes.RiskLevel import RiskLevel


class SchoolRiskItem(BaseModel):
    school_id: str
    school_name: str
    risk_percentage: float = Field(..., ge=0, le=100)
    student_count: int
    risk_level: RiskLevel = Field(..., description="Risk level based on risk percentage")
    
    @classmethod
    def calculate_risk_level(cls, risk_percentage: float) -> RiskLevel:
        if risk_percentage >= 75:
            return RiskLevel.CRITICAL
        elif risk_percentage >= 50:
            return RiskLevel.HIGH
        elif risk_percentage >= 30:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW