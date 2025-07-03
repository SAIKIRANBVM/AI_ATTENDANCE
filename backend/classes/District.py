from pydantic import BaseModel
from typing import List, Optional

class District(BaseModel):
    id: int
    name: str