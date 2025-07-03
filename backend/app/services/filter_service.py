from backend.classes.FilterOptions import FilterOptions
from backend.app.services.filters import (
    get_filter_options,
    list_districts,
    list_schools,
    list_grades,
)
from backend.app.data_store import data_store


class FilterService:
    @staticmethod
    def filter_options() -> FilterOptions:
        return get_filter_options(data_store.df)

    @staticmethod
    def districts():
        return list_districts(data_store.df)

    @staticmethod
    def schools(district: str | None):
        return list_schools(data_store.df, district)

    @staticmethod
    def grades(district: str | None, school: str | None):
        return list_grades(data_store.df, district, school)
