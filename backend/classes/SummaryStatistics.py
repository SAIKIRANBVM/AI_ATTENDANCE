from pydantic import BaseModel
from typing import Optional

class SummaryStatistics(BaseModel):
    totalStudents: int
    below85Students: int
    below85Percentage: float
    tier4Students: int
    tier4Percentage: float
    tier3Students: int
    tier3Percentage: float
    tier2Students: int
    tier2Percentage: float
    tier1Students: int
    tier1Percentage: float
    schoolPrediction: Optional[float] = None
    gradePrediction: Optional[float] = None