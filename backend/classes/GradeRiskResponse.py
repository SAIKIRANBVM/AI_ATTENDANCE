from pydantic import BaseModel
from typing import List, Optional

class GradeRiskItem(BaseModel):
    grade: str
    risk_percentage: float
    student_count: int
    
class GradeRiskResponse(BaseModel):
    grades: List[GradeRiskItem] = []
    total_students: int = 0
    average_risk: float = 0.0
