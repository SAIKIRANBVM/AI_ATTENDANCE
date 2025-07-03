from pydantic import BaseModel
from typing import List, Optional

class StudentMetrics(BaseModel):
    year: str
    attendanceRate: Optional[float]
    unexcused: Optional[float]
    present: Optional[float]
    total: Optional[int]
 