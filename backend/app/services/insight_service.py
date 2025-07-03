from backend.classes.AnalysisSearchCriteria import AnalysisSearchCriteria
from backend.classes.AnalysisResponse import AnalysisResponse
from backend.app.services.analysis import make_analysis
from backend.app.data_store import data_store
from backend.app.services.filters import filter_data


class InsightService:
    @staticmethod
    def prediction_insights(criteria: AnalysisSearchCriteria) -> AnalysisResponse:
        return make_analysis(criteria, data_store, filter_data)
