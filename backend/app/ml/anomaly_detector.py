from pathlib import Path
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline

from backend.app.utils.preprocessing import add_basic_rates, split_features


class AnomalyDetector:
    def __init__(self):
        self.pipe: Pipeline | None = None
        self.cols: list[str] = []

    def train(self, df):
        df = add_basic_rates(df)
        self.cols = ["ATTENDANCE_RATE", "UNEXCUSED_ABSENT_RATE"]
        X = df[self.cols]
        pre = split_features(df, self.cols)
        iso = IsolationForest(n_estimators=200, contamination=0.05, n_jobs=-1, random_state=42)
        self.pipe = Pipeline([("pre", pre), ("iso", iso)]).fit(X)
        return self

    def score(self, df):
        X = df[self.cols]
        return -self.pipe.score_samples(X) #type:ignore

    def save(self, p: str | Path):
        joblib.dump((self.cols, self.pipe), p)

    @classmethod
    def load(cls, p: str | Path):
        cols, pipe = joblib.load(p)
        obj = cls()
        obj.cols = cols
        obj.pipe = pipe
        return obj
