import pandas as pd
from typing import List

from backend.app.utils.generate_insights import generate_ai_insights
from backend.app.utils.generate_recommendations import generate_ai_recommendations
from backend.classes.KeyInsight import KeyInsight
from backend.classes.Recommendation import Recommendation

class GenerationService:

    @classmethod
    def generate_insights(cls, df: pd.DataFrame) -> List[KeyInsight]:
        return generate_ai_insights(df)

    
    @classmethod
    def generate_recommendations(cls, df: pd.DataFrame) -> List[Recommendation]:
        return generate_ai_recommendations(df)