from pydantic import BaseModel
from typing import List

from backend.classes.ValueLabelPair import ValueLabelPair
from backend.classes.SchoolResponse import SchoolResponse
from backend.classes.GradeResponse import GradeResponse


class FilterOptions(BaseModel):
    districts: List[ValueLabelPair]
    schools: List[SchoolResponse]
    grades: List[GradeResponse]
