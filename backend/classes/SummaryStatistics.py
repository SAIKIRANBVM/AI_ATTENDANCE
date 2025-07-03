from pydantic import BaseModel
from typing import Optional

class SummaryStatistics(BaseModel):
    total_students: int
    below_85_students: int
    below_85_percentage: float
    tier4_students: int
    tier4_percentage: float
    tier3_students: int
    tier3_percentage: float
    tier2_students: int
    tier2_percentage: float
    tier1_students: int
    tier1_percentage: float
    school_prediction: Optional[float] = None
    grade_prediction: Optional[float] = None