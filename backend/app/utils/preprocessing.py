import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def add_basic_rates(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if {"Total_Days_Present", "Total_Days_Enrolled"} <= set(df):
        df["ATTENDANCE_RATE"] = (
            df["Total_Days_Present"] / df["Total_Days_Enrolled"] * 100
        )
    if {"Total_Days_Unexcused_Absent", "Total_Days_Enrolled"} <= set(df):
        df["UNEXCUSED_ABSENT_RATE"] = (
            df["Total_Days_Unexcused_Absent"] / df["Total_Days_Enrolled"] * 100
        )
    return df


def split_features(df: pd.DataFrame, cols: list[str]):
    num = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
    cat = list(set(cols) - set(num))
    num_t = Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
    cat_t = Pipeline(
        [
            ("impute", SimpleImputer(strategy="constant", fill_value="missing")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer([("num", num_t, num), ("cat", cat_t, cat)])
