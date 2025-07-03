import pandas as pd
import os
from typing import Tuple, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YearConfig:
    def __init__(
            self, 
            predictions_data_path: str = "backend/data/Predictions.parquet",
            alerts_data_path: str = "backend/data/Alerts.parquet"
        ):
        self.predictions_data_path = predictions_data_path
        self.alerts_data_path = alerts_data_path
        self._current_year = None
        self._predicted_year = None
        self._year_range = []
        self._min_year = None
        self._max_year = None
        self._initialize_config()

    def _initialize_config(self):
        try:
            if not os.path.exists(self.predictions_data_path):
                return
            
            df = pd.read_parquet(self.predictions_data_path)

            if df.empty or "SCHOOL_YEAR" not in df.columns:
                return
            
            years = sorted(int(y) for y in df["SCHOOL_YEAR"].dropna().unique())

            if not years:
                return
            
            self._min_year = min(years)
            self._max_year = max(years) - 1
            self._current_year = self._max_year
            self._predicted_year = self._max_year + 1
            self._year_range = list(range(self._min_year, self._predicted_year))
        except Exception as e:
            logger.info(f'Error Reading values: {e}')

    
    
    @property
    def current_year(self) -> int | None:
        return self._current_year
    
    @property
    def predicted_year(self) -> int | None:
        return self._predicted_year
    
    @property
    def year_range(self) -> List[int]:
        return self._year_range.copy()
    
    @property
    def min_year(self) -> int | None:
        return self._min_year
    
    @property
    def max_year(self) -> int | None:
        return self._max_year
    
    def get_historical_years(self) -> List[int]:
        return [year for year in self._year_range if year <= self._current_year] # type:ignore
    
    def get_year_range_for_metrics(self) -> List[int]:
        return self.get_historical_years()
    
    def get_year_range_for_trends(self) -> List[int]: 
        return self._year_range + [self._predicted_year] # type:ignore
    
    def is_current_year(self, year: int) -> bool:
        return year == self._current_year
    
    def is_predicted_year(self, year: int) -> bool:
        return year == self._predicted_year
    
    def refresh_config(self):
        logger.info("Refreshing year configuration...")
        self._initialize_config()
    
    def get_config_summary(self) -> dict:
        return {
            "data_path": self.predictions_data_path,
            "min_year": self._min_year,
            "max_year": self._max_year,
            "current_year": self._current_year,
            "predicted_year": self._predicted_year,
            "year_range": self._year_range,
            "total_years": len(self._year_range)
        }


year_config = YearConfig()

def get_current_year() -> int | None:
    return year_config.current_year

def get_predicted_year() -> int | None:
    return year_config.predicted_year

def get_year_range() -> List[int]:
    return year_config.year_range

def get_historical_years() -> List[int]:
    return year_config.get_historical_years()

def refresh_year_config():
    year_config.refresh_config()

__all__ = [
    'YearConfig',
    'year_config',
    'get_current_year',
    'get_predicted_year', 
    'get_year_range',
    'get_historical_years',
    'refresh_year_config'
]