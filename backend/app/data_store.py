import pandas as pd
from datetime import datetime

class DataStore:
    df = pd.DataFrame()
    last_loaded = datetime.now()
    loading = False
    load_error = ''
    indices = {}
    is_ready = False
    ml_models = {}
    anomaly_detector = None
    cluster_model = None
    feature_importance = None
    prediction_cache = {}
    anomaly_feature_columns = []


data_store = DataStore()