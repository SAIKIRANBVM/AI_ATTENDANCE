import numpy as np

from backend.classes.SummaryStatistics import SummaryStatistics
from backend.classes.KeyInsight import KeyInsight
from backend.classes.Recommendation import Recommendation
from backend.classes.AnalysisResponse import AnalysisResponse


def tier(att):
    if att >= 95:
        return "Tier 1"
    if att >= 90:
        return "Tier 2"
    if att >= 80:
        return "Tier 3"
    return "Tier 4"


def risk_level(att):
    if att >= 95:
        return "Low"
    if att >= 90:
        return "Medium"
    if att >= 80:
        return "High"
    return "Critical"


def make_analysis(criteria, store, fil):
    df = fil(
        store.df,
        criteria.district_code,
        criteria.school_code,
        criteria.grade_code,
    )
    if df.empty:
        raise ValueError("no data for filters")
    if "Predicted_Attendance" not in df:
        df["Predicted_Attendance"] = df["Predictions"] * 100
    df["TIER"] = df["Predicted_Attendance"].apply(tier)
    df["RISK_LEVEL"] = df["Predicted_Attendance"].apply(risk_level)
    total = len(df)
    tcounts = df["TIER"].value_counts()
    summary = SummaryStatistics(
        total_students=total,
        below_85_students=int((df["Predicted_Attendance"] < 85).sum()),
        below_85_percentage=float((df["Predicted_Attendance"] < 85).mean() * 100),
        tier4_students=int(tcounts.get("Tier 4", 0)),
        tier4_percentage=float(tcounts.get("Tier 4", 0) / total * 100),
        tier3_students=int(tcounts.get("Tier 3", 0)),
        tier3_percentage=float(tcounts.get("Tier 3", 0) / total * 100),
        tier2_students=int(tcounts.get("Tier 2", 0)),
        tier2_percentage=float(tcounts.get("Tier 2", 0) / total * 100),
        tier1_students=int(tcounts.get("Tier 1", 0)),
        tier1_percentage=float(tcounts.get("Tier 1", 0) / total * 100),
        school_prediction=None,
        grade_prediction=None,
    )
    insights = [
        KeyInsight(
            insight=f"{tcounts.get('Tier 4',0)} students ({summary.tier4_percentage:.1f}%) are <80% attendance"
        ),
        KeyInsight(
            insight=f"{tcounts.get('Tier 3',0)} students ({summary.tier3_percentage:.1f}%) are 80–90% attendance"
        ),
    ]
    recs = [
        Recommendation(recommendation="Target Tier 4 with intensive support"),
        Recommendation(recommendation="Monitor Tier 3 weekly"),
    ]
    return AnalysisResponse(
        summary_statistics=summary, key_insights=insights, recommendations=recs
    )
