import io, datetime as dt
from backend.app.utils.preprocessing import add_basic_rates
from pandas import DataFrame

from backend.classes.DownloadReportCriteria import DownloadReportCriteria
from backend.app.services.filters import filter_data


def build_report(criteria: DownloadReportCriteria, typ: str, store, fil):
    df = filter_data(
        store.df, criteria.district_code, criteria.school_code, criteria.grade_code
    )
    if df.empty:
        raise ValueError("no data")
    if "Predicted_Attendance" not in df:
        df["Predicted_Attendance"] = df["Predictions"] * 100
    df = add_basic_rates(df)
    if typ.lower() == "below_85":
        rep = df[df["Predicted_Attendance"] < 85].copy()
    elif typ.lower() == "tier1":
        rep = df[df["Predicted_Attendance"] >= 95].copy()
    elif typ.lower() == "tier4":
        rep = df[df["Predicted_Attendance"] < 80].copy()
    elif typ.lower() == "summary":
        rep = (
            df.groupby(["DISTRICT_NAME", "STUDENT_GRADE_LEVEL"])
            .agg(count=("STUDENT_ID", "count"), avg_att=("Predicted_Attendance", "mean"))
            .reset_index()
        )
    else:
        rep = df.copy()
    buf = io.BytesIO()
    rep.to_excel(buf, index=False)
    buf.seek(0)
    fname = f"{typ}_{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return buf, fname
