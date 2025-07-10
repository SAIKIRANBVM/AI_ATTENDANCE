from pydantic import BaseModel
from typing import List

from backend.classes.SummaryStatistics import SummaryStatistics
from backend.classes.KeyInsight import KeyInsight
from backend.classes.Recommendation import Recommendation

class AnalysisResponse(BaseModel):
    summary_statistics: SummaryStatistics
    key_insights: List[KeyInsight]
    recommendations: List[Recommendation]