import pandas as pd

from backend.classes.FilterOptions import FilterOptions


def filter_data(df, district_code=None, school_code=None, grade_code=None):
    mask = pd.Series(True, index=df.index)
    if district_code:
        mask &= df["DISTRICT_CODE"].astype(str) == str(district_code)
    if school_code:
        mask &= df["LOCATION_ID"].astype(str) == str(school_code)
    if grade_code:
        mask &= df["STUDENT_GRADE_LEVEL"].astype(str) == str(grade_code)
    return df[mask].copy()


def get_filter_options(df):
    districts = (
        df.groupby(["DISTRICT_CODE", "DISTRICT_NAME"])
        .size()
        .reset_index()
        .drop_duplicates(subset=['DISTRICT_NAME'])
        .rename(columns={0: "cnt"})
    )
    schools = (
        df.groupby(["DISTRICT_CODE", "LOCATION_ID", "SCHOOL_NAME"])
        .size()
        .reset_index()
        .rename(columns={0: "cnt"})
    )
    grades = (
        df.groupby(["LOCATION_ID", "STUDENT_GRADE_LEVEL"])
        .size()
        .reset_index()
        .rename(columns={0: "cnt"})
    )
    return FilterOptions(
        districts=[
            {"value": str(r.DISTRICT_CODE), "label": r.DISTRICT_NAME.strip()}
            for r in districts.itertuples()
        ],
        schools=[
            {
                "value": str(r.LOCATION_ID),
                "label": r.SCHOOL_NAME.strip(),
                "district": str(r.DISTRICT_CODE),
            }
            for r in schools.itertuples()
        ],
        grades=[
            {
                "value": str(r.STUDENT_GRADE_LEVEL),
                "label": f"Grade {r.STUDENT_GRADE_LEVEL}",
                "school": str(r.LOCATION_ID),
            }
            for r in grades.itertuples()
        ],
    )


def list_districts(df):
    return [
        {"value": str(c), "label": n.strip()}
        for c, n in df[["DISTRICT_CODE", "DISTRICT_NAME"]].drop_duplicates().values
    ]


def list_schools(df, district):
    if district:
        df = df[df["DISTRICT_CODE"].astype(str) == str(district)]
    return [
        {"value": str(r.LOCATION_ID), "label": r.SCHOOL_NAME.strip()}
        for r in df[["LOCATION_ID", "SCHOOL_NAME"]].drop_duplicates().itertuples()
    ]


def list_grades(df, district, school):
    if district:
        df = df[df["DISTRICT_CODE"].astype(str) == str(district)]
    if school:
        df = df[df["LOCATION_ID"].astype(str) == str(school)]
    return sorted(
        [
            {
                "value": str(g),
                "label": "PK" if g == "-1" else ("K" if g == "0" else f"Grade {g}"),
            }
            for g in df["STUDENT_GRADE_LEVEL"].dropna().unique()
        ],
        key=lambda x: int(x["value"]) if x["value"].isdigit() else 99,
    )
