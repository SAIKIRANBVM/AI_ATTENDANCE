from types import SimpleNamespace
from backend.app.services.reports import build_report
from backend.app.data_store import data_store
from backend.classes.DownloadReportCriteria import DownloadReportCriteria


class ReportService:
    @staticmethod
    def generate(report_type: str, criteria: DownloadReportCriteria):
        buf, fname = build_report(criteria, report_type, data_store, lambda *_: _)
        return SimpleNamespace(buffer=buf, filename=fname)
