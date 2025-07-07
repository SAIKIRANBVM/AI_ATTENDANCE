from backend.app.config import get_alerts_data_path, get_current_year
from backend.app.utils.logger import logger
from backend.app.data_store import data_store
from backend.app.utils.model_file_utils import FileUtils
from backend.app.utils.alerts_utils import al_utils
from backend.app.services.ai_predictions import apply_ai_predictions_to_dataset
from backend.app.ml.risk_model import RiskModel
from backend.app.ml.anomaly_detector import AnomalyDetector
from backend.app.ml.cluster_model import ClusterModel

import time
import pandas as pd
import concurrent.futures
from datetime import datetime


CURRENT_SCHOOL_YEAR = get_current_year()
RISK_MODEL = RiskModel()
ANOMALY_DETECTOR = AnomalyDetector()
CLUSTER_MODEL = ClusterModel()


def load_data() -> pd.DataFrame:
    try:
        df = pd.read_parquet(get_alerts_data_path())
        return df
    except Exception as e:
        print(f'Failed to load Data: {e}')
        return pd.DataFrame()



def load_and_process():
    file_utils = FileUtils()
    try:
        data_store.loading = True
        data_store.is_ready = False
        data_store.load_error = ''
        logger.info('Starting data loading and AI model training...')
        start_time = time.time()

        df = load_data()

        if df is None or len(df) == 0:
            data_store.load_error = 'Failed to load data'
            data_store.loading = False
            return
        
        logger.info(f'Available columns in DataFrame: {df.columns.tolist()}')


        if 'SCHOOL_YEAR' in df.columns:
            df['SCHOOL_YEAR'] = pd.to_numeric(df['SCHOOL_YEAR'], errors='coerce')
            current_year_df = df[df['SCHOOL_YEAR'] == int(CURRENT_SCHOOL_YEAR)] #type:ignore

            if len(current_year_df) > 0:
                df = current_year_df
                logger.info(f'Filtered to {CURRENT_SCHOOL_YEAR} data: {len(df)} records')
            else:
                logger.warning(f'No {CURRENT_SCHOOL_YEAR} data found, using all available data')


        if 'STUDENT_ID' in df.columns:
            df = df.drop_duplicates(subset=['STUDENT_ID'])
            logger.info(f'Removed duplicates: {len(df)} unique students')

        else:
            raise ValueError('STUDENT_ID column not found in data')
        

        if 'Predictions' not in df.columns:
            raise ValueError('Predictions column not found in data')
        

        with concurrent.futures.ThreadPoolExecutor() as executor:
            predictions_future = executor.submit(lambda: df['Predictions'].values)
            predictions = predictions_future.result()
            df['RISK_SCORE'] = 100 - predictions #type:ignore
            df['RISK_LEVEL'] = pd.cut(df['RISK_SCORE'], bins=[0, 20, 40, 60, 80, 100], labels=['Very Low', 'Low', 'Medium', 'High', 'Critical'])
            df['Predicted_Attendance'] = predictions
            df['TIER'] = df['Predicted_Attendance'].apply(al_utils.assign_tiers)
            train_ml_models_future = executor.submit(RISK_MODEL.train_ml_model, df)
            train_anomaly_detector_future = executor.submit(ANOMALY_DETECTOR.train_anomaly_detector, df)
            train_clustering_future = executor.submit(CLUSTER_MODEL.train_clustering, df)
            data_store.ml_models = train_ml_models_future.result()
            data_store.anomaly_detector = train_anomaly_detector_future.result()
            data_store.cluster_model, data_store.cluster_insights = train_clustering_future.result() #type:ignore


        data_store.indices = {'DISTRICT_NAME': df['DISTRICT_NAME'].str.upper().to_dict(), 'STUDENT_GRADE_LEVEL': df['STUDENT_GRADE_LEVEL'].astype(str).to_dict()}


        if 'SCHOOL_NAME' in df.columns:
            data_store.indices['SCHOOL_NAME'] = df['SCHOOL_NAME'].str.upper().to_dict()


        if 'ATTENDANCE_RATE' not in df.columns and 'Total_Days_Present' in df.columns and 'Total_Days_Enrolled' in df.columns:
            df['ATTENDANCE_RATE'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
            

        apply_ai_predictions_to_dataset(df)
        data_store.df = df #type:ignore
        

        if 'risk_predictor' not in data_store.ml_models:
            logger.warning('Risk predictor model still not available after training. Checking for cached model...')
            model = file_utils.load_model('risk_predictor')

            if model:
                data_store.ml_models['risk_predictor'] = model
                logger.info('Successfully loaded risk predictor from cache')
            else:
                logger.error('Failed to load risk predictor model from cache')


        data_store.last_loaded = datetime.now()
        processing_time = time.time() - start_time
        logger.info(f'Data processing and AI model training completed in {processing_time:.2f} seconds')
        data_store.is_ready = True


    except Exception as e:
        logger.error(f'Error in data processing: {str(e)}')
        data_store.load_error = str(e)

        
    finally:
        data_store.loading = False
        return df
