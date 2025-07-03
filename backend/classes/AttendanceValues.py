from pydantic import BaseModel
from typing import List, Optional

class AttendanceValues(BaseModel):
    year: str
    predictedAttendance: float
    totalDays: float | None