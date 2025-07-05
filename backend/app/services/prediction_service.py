from backend.classes.DataRequest   import DataRequest
from backend.classes.DataResponse  import DataResponse
from backend.classes.StudentsResponse import StudentsResponse
from backend.app.services.predictions  import (
    cached_students,
    cached_schools,
    cached_districts,
)


class PredictionService:
    @staticmethod
    def students() -> StudentsResponse:
        return {
            "districts": cached_districts,
            "schools": cached_schools,
            "students": cached_students,
        } #type:ignore

    @staticmethod
    def all_districts() -> DataResponse:
        from backend.app.services.predictions import get_all_districts_summary
        return get_all_districts_summary()

    @staticmethod
    def district(req: DataRequest) -> DataResponse:
        from backend.app.services.predictions import get_district_summary  # type:ignore
        return get_district_summary(req)

    @staticmethod
    def school(req: DataRequest) -> DataResponse:
        from backend.app.services.predictions import get_school_summary # type:ignore
        return get_school_summary(req)

    @staticmethod
    def grade_details(req: DataRequest) -> DataResponse:
        from backend.app.services.predictions import get_grade_summary # type:ignore
        return get_grade_summary(req)

    @staticmethod
    def student_details(req: DataRequest) -> DataResponse:
        from backend.app.services.predictions import get_student_summary # type:ignore
        return get_student_summary(req)
