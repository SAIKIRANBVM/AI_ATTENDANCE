from pydantic import BaseModel
from typing import List

from backend.classes.SummaryStatistics import SummaryStatistics
from backend.classes.KeyInsight import KeyInsight
from backend.classes.Recommendation import Recommendation

class AnalysisResponse(BaseModel):
    summaryStatistics: SummaryStatistics
    keyInsights: List[KeyInsight]
    recommendations: List[Recommendation]