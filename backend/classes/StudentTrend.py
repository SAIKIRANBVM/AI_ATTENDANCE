from pydantic import BaseModel
from typing import List, Optional

class StudentTrend(BaseModel):
    year: str
    value: float
    isPredicted: bool