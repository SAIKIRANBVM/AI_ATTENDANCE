from pathlib import Path
import joblib
from sklearn.cluster import KMeans
from sklearn.pipeline import Pipeline

from backend.app.utils.preprocessing import add_basic_rates, split_features


class ClusterModel:
    def __init__(self, k: int = 3):
        self.k = k
        self.pipe: Pipeline | None = None
        self.cols: list[str] = []

    def train(self, df):
        df = add_basic_rates(df)
        self.cols = ["ATTENDANCE_RATE", "UNEXCUSED_ABSENT_RATE", "STUDENT_GRADE_LEVEL"]
        X = df[self.cols]
        pre = split_features(df, self.cols)
        km = KMeans(n_clusters=self.k, random_state=42, n_init=10)
        self.pipe = Pipeline([("pre", pre), ("km", km)]).fit(X)
        return self

    def labels(self, df):
        X = df[self.cols]
        pre = self.pipe.named_steps["pre"] #type:ignore
        km = self.pipe.named_steps["km"] #type:ignore
        return km.predict(pre.transform(X))

    def save(self, p: str | Path):
        joblib.dump((self.cols, self.pipe), p)

    @classmethod
    def load(cls, p: str | Path):
        cols, pipe = joblib.load(p)
        obj = cls(pipe.named_steps["km"].n_clusters)
        obj.cols = cols
        obj.pipe = pipe
        return obj
