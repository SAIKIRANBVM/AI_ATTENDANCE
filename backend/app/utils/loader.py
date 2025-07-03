from backend.app.config import YearConfig
import pandas as pd


def load_data() -> pd.DataFrame:
    cfg = YearConfig()
    try:
        return pd.read_parquet(cfg.alerts_data_path)
    except Exception as e:
        print(f'Failed to Load Data: {e}')
        return pd.DataFrame()
