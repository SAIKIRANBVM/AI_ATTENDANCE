from pydantic import BaseModel
from typing import List, Optional

class School(BaseModel):
    id: int
    name: str
    districtId: int