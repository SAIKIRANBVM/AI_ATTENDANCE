from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse, StreamingResponse

from backend.app.utils.loader import load_data
from backend.app.utils.preprocessing import add_basic_rates
from backend.app.data_store import data_store
from backend.app.ml import get_models
from backend.app.services.predictions import load_and_process_data
from backend.app.services.insight_service import InsightService
from backend.app.services.filter_service import FilterService
from backend.app.services.report_service import ReportService
from backend.app.services.prediction_service import PredictionService
from backend.classes.AnalysisSearchCriteria import AnalysisSearchCriteria
from backend.classes.DataRequest import DataRequest
from backend.classes.DownloadReportCriteria import DownloadReportCriteria
from backend.app.services import alerts

app = FastAPI(
    default_response_class=ORJSONResponse,
)
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:8080/alerts",
    "http://127.0.0.1:8080/alerts",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8081/alerts",
    "http://127.0.0.1:8081/alerts"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,                       
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH",
                   "DELETE", "OPTIONS"],         
    allow_headers=["Content-Type", "Authorization"]
)


@app.on_event("startup")
def bootstrap():
    alerts.load_and_process_data()
    load_and_process_data()
    df_local = add_basic_rates(load_data())
    if df_local.empty:
        raise RuntimeError("no data")
    data_store.df = df_local # type:ignore
    data_store.risk_model, data_store.anomaly_model, data_store.cluster_model = get_models(df_local) # type: ignore


def ready():
    if data_store.df is None:
        raise HTTPException(503, "loading")



@app.post("/api/alerts/prediction-insights", response_model=InsightService.prediction_insights.__annotations__["return"])
def prediction_insights(criteria: AnalysisSearchCriteria):
    ready()
    return alerts.get_analysis(criteria)


@app.get("/api/alerts/filter-options", response_model=FilterService.filter_options.__annotations__["return"])
def filter_options():
    ready()
    return alerts.get_filter_options()


@app.get("/api/alerts/filters/districts")
def districts():
    ready()
    return alerts.get_districts()


@app.get("/api/alerts/filters/schools")
def schools(district_code: str | None = None):
    ready()
    return alerts.get_schools(district_code)


@app.get("/api/alerts/filters/grades")
def grades(district_code: str | None = None, school_code: str | None = None):
    ready()
    return alerts.get_grades(district_code, school_code)


@app.post("/api/alerts/download/report/{report_type}")
def download_report(report_type: str, criteria: DownloadReportCriteria):
    ready()
    return alerts.download_report(criteria, report_type)


@app.get("/api/predictions/students")
def students():
    return PredictionService.students()


@app.get("/api/predictions/all-districts")
def all_districts():
    return PredictionService.all_districts()


@app.post("/api/predictions/district")
def district_summary(req: DataRequest):
    return PredictionService.district(req)


@app.post("/api/predictions/school")
def school_summary(req: DataRequest):
    return PredictionService.school(req)


@app.post("/api/predictions/grade-details")
def grade_summary(req: DataRequest):
    return PredictionService.grade_details(req)


@app.post("/api/predictions/student-details")
def student_summary(req: DataRequest):
    return PredictionService.student_details(req)
