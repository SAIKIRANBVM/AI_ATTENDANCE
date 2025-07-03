from pydantic import BaseModel
from typing import List

from backend.classes.ValueLabelPair import ValueLabelPair
from backend.classes.SchoolOption import SchoolOption
from backend.classes.GradeResponse import GradeResponse


class FilterOptions(BaseModel):
    districts: List[ValueLabelPair]
    schools: List[SchoolOption]
    grades: List[GradeResponse]
