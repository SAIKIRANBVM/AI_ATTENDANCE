from backend.classes.ValueLabelPair import ValueLabelPair
from typing import Optional

class GradeResponse(ValueLabelPair):
    schoolCode: Optional[str] = None
    districtCode: Optional[str] = None