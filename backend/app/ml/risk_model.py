from pathlib import Path
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline

from backend.app.utils.preprocessing import add_basic_rates, split_features


class RiskModel:
    def __init__(self, threshold: int = 85):
        self.t = threshold
        self.pipe: Pipeline | None = None
        self.cols: list[str] = []

    def train(self, df):
        df = add_basic_rates(df)
        self.cols = [
            "ATTENDANCE_RATE",
            "UNEXCUSED_ABSENT_RATE",
            "ECONOMIC_CODE",
            "SPECIAL_ED_CODE",
            "ENG_PROF_CODE",
            "HISPANIC_IND",
            "STUDENT_GRADE_LEVEL",
        ]
        X = df[self.cols]
        y = (df["ATTENDANCE_RATE"] < self.t).astype(int)
        pre = split_features(df, self.cols)
        clf = RandomForestClassifier(
            n_estimators=200, max_depth=10, class_weight="balanced", n_jobs=-1, random_state=42
        )
        self.pipe = Pipeline([("pre", pre), ("clf", clf)]).fit(X, y)
        return self

    def predict_proba(self, df):
        X = df[self.cols]
        return self.pipe.predict_proba(X)[:, 1] #type:ignore

    def save(self, p: str | Path):
        joblib.dump({"t": self.t, "cols": self.cols, "pipe": self.pipe}, p)

    @classmethod
    def load(cls, p: str | Path):
        blob = joblib.load(p)
        obj = cls(blob["t"])
        obj.cols = blob["cols"]
        obj.pipe = blob["pipe"]
        return obj
