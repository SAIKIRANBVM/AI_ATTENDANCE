from pydantic import BaseModel
from typing import List, Optional

from backend.classes.AttendanceValues import AttendanceValues
from backend.classes.StudentMetrics import StudentMetrics
from backend.classes.StudentTrend import StudentTrend

class DataResponse(BaseModel):
    previousAttendance: float | None
    predictedAttendance: float
    predictedValues: AttendanceValues
    metrics: List[StudentMetrics]
    trends: List[StudentTrend]