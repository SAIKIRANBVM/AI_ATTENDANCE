from pydantic import BaseModel
from typing import List, Optional

from backend.classes.District import District
from backend.classes.School import School
from backend.classes.Student import Student

class StudentsResponse(BaseModel):
    districts: List[District] 
    schools: List[School] 
    students: List[Student] 