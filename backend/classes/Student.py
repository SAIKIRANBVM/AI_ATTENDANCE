from pydantic import BaseModel

class Student(BaseModel):
    id: str
    locationId: int
    grade: str
    schoolName: str
    districtName: str
    districtId: int