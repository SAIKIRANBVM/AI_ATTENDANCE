from pydantic import BaseModel
from typing import List, Optional

class DataRequest(BaseModel):
    studentId: Optional[int] = None
    grade: Optional[int] = -3
    districtId: Optional[int] = None
    locationID: Optional[int] = None