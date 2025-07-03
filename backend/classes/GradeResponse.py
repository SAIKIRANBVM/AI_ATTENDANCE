from backend.classes.ValueLabelPair import ValueLabelPair
from typing import Optional

class GradeResponse(ValueLabelPair):
    school: Optional[str] = None
    district: Optional[str] = None