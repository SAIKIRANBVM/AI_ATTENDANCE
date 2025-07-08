from backend.classes.ValueLabelPair import ValueLabelPair
from typing import Optional

class GradeResponse(ValueLabelPair):
    school_code: Optional[str] = None
    district_code: Optional[str] = None