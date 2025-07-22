from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from backend.app.utils.loader import load_and_process
from backend.app.data_store import data_store
from backend.app.services.predictions import load_and_process_data
from backend.app.services.prediction_service import PredictionService
from backend.classes.FilterCriteria import FilterCriteria
from backend.classes.AnalysisResponse import AnalysisResponse
from backend.classes.FilterOptions import FilterOptions
from backend.classes.DataRequest import DataRequest
from backend.classes.GradeRiskResponse import GradeRiskResponse
from backend.classes.SchoolRiskResponse import SchoolRiskResponse, SchoolRiskItem
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
    "http://127.0.0.1:8081/alerts", 
    "https://best.bvm.ngrok.app/aip_aip/aip/FastAPIService/predictions/students"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins="*",                       
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH",
                "DELETE", "OPTIONS"],         
    allow_headers=["Content-Type", "Authorization"]
)


@app.on_event('startup')
def bootstrap():
    load_and_process()
    load_and_process_data()
    


def ready():
    if data_store.df is None:
        raise HTTPException(503, "loading")



@app.post("/api/alerts/prediction-insights", response_model=AnalysisResponse)
def prediction_insights(criteria: FilterCriteria):
    ready()
    return alerts.get_analysis(criteria)


@app.get("/api/alerts/filter-options", response_model=FilterOptions)
def filter_options():
    ready()
    return alerts.get_filter_options()


@app.get("/api/alerts/grade-risks/district/{district}/school/{school}", response_model=GradeRiskResponse)
def get_grade_risks(district: str | None = None, school: str | None = None):
    """
    Get grade-level risk data for the specified district and/or school.
    
    Args:
        district: Optional district code to filter by
        school: Optional school code to filter by
        
    Returns:
        GradeRiskResponse containing risk data by grade level
    """
    ready()
    return alerts.get_grade_risk_data(district, school)


@app.get("/api/alerts/school-risks/district/{district}", response_model=SchoolRiskResponse)
def get_school_risks(district: str | None = None):
    """
    Get school-level risk data for the specified district.
    
    Args:
        district: Optional district code to filter by
        
    Returns:
        SchoolRiskResponse containing risk data by school
    """
    ready()
    return alerts.get_school_risk_data(district)



@app.get("/api/alerts/schools/district/{districtCode}")
def schools(districtCode: str | None = None):
    ready()
    return alerts.get_schools(districtCode)


@app.get("/api/alerts/grades/district/{districtCode}/school/{schoolCode}")
def grades(districtCode: str | None = None, schoolCode: str | None = None):
    ready()
    print(f"Fetching grades for district: {districtCode}, school: {schoolCode}")
    return alerts.get_grades(districtCode, schoolCode)


@app.post("/api/alerts/download/report/{reportType}")
def download_report(reportType: str, criteria: FilterCriteria):
    ready()
    return alerts.download_report(criteria, reportType)


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
