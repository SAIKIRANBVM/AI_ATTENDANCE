from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from backend.classes.SummaryStatistics import SummaryStatistics
from backend.classes.KeyInsight import KeyInsight
from backend.classes.Recommendation import Recommendation

class AnalysisResponse(BaseModel):
    summaryStatistics: SummaryStatistics
    keyInsights: List[KeyInsight]
    recommendations: List[Recommendation]
    alertsNotifications: Optional[Dict[str, Any]] = None