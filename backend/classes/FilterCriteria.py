from pydantic import BaseModel
from typing import Optional

class FilterCriteria(BaseModel):
    districtCode: Optional[str] = None
    gradeCode: Optional[str] = None
    schoolCode: Optional[str] = None