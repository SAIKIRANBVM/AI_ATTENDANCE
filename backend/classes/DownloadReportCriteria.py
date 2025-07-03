from pydantic import BaseModel
from typing import Optional


class DownloadReportCriteria(BaseModel):
    district_code: Optional[str] = None
    grade_code: Optional[str] = None
    school_code: Optional[str] = None