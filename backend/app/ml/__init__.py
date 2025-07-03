from pathlib import Path
from .risk_model import RiskModel
from .anomaly_detector import AnomalyDetector
from .cluster_model import ClusterModel

CACHE = Path("model_cache")
CACHE.mkdir(exist_ok=True)


def _p(n): return CACHE / f"{n}.joblib"


def _get(cls, name, df, **kw):
    p = _p(name)
    if p.exists():
        return cls.load(p)
    m = cls(**kw).train(df)
    m.save(p)
    return m


def get_models(df):
    return (
        _get(RiskModel, "risk", df),
        _get(AnomalyDetector, "anomaly", df),
        _get(ClusterModel, "cluster", df),
    )
