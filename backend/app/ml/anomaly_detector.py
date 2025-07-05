import os
import pandas as pd
import numpy as np

from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler
from sklearn.impute import SimpleImputer

from backend.app.utils.logger import logger
from backend.app.utils.model_file_utils import file_utils
from backend.app.data_store import data_store

class AnomalyDetector:
    def train_anomaly_detector(self, df, force_retrain=True):
        try:
            logger.info('Training anomaly detection model...')

            try:
                model_path = os.path.join('model_cache', 'anomaly_detector.joblib')
                if os.path.exists(model_path):
                    os.remove(model_path)
                    logger.info('Removed existing model to ensure clean retrain')
            except Exception as e:
                logger.warning(f'Could not remove existing model: {e}')

            features = []
            df = df.copy()

            if all(col in df.columns for col in ['Total_Days_Present', 'Total_Days_Enrolled']):
                df['ATTENDANCE_RATE'] = (
                    df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
                )
                features.append('ATTENDANCE_RATE')

            if all(col in df.columns for col in ['Total_Days_Unexcused_Absent', 'Total_Days_Enrolled']):
                df['UNEXCUSED_ABSENT_RATE'] = (
                    df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
                )
                features.append('UNEXCUSED_ABSENT_RATE')

            if not features:
                raise ValueError(
                    "No valid features available for anomaly detection. "
                    "Need either attendance data or unexcused absence data."
                )

            logger.info(f'Using {len(features)} features for anomaly detection: {features}')

            X = df[features].copy()

            numeric_transformer = Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', RobustScaler())
            ])

            X_processed = numeric_transformer.fit_transform(X)

            if len(X_processed) < 20:
                raise ValueError(
                    f"Insufficient data for anomaly detection. "
                    f"Need at least 20 samples, got {len(X_processed)}"
                )

            X_df = pd.DataFrame(X, columns=features)

            model = None
            force_retrain = True

            if model is None or force_retrain:
                logger.info("Training new anomaly detection model...")
                contamination = min(0.1, 5.0 / len(X_processed))

                model = Pipeline([
                    ('preprocessor', numeric_transformer),
                    ('detector', IsolationForest(
                        n_estimators=100,
                        contamination=contamination,
                        random_state=42,
                        n_jobs=-1,
                        verbose=1
                    ))
                ])

                model.fit(X_df)
                file_utils.save_model(model, 'anomaly_detector')
                logger.info(
                    f"Trained new anomaly detector with features: {features}, "
                    f"contamination={contamination:.2f}"
                )
            else:
                logger.info("Using cached anomaly detection model")

            data_store.anomaly_detector = model  #type:ignore
            data_store.anomaly_feature_columns = features

            if len(X_df) > 0:
                try:
                    anomaly_scores = -model.score_samples(X_df)
                    df['ANOMALY_SCORE'] = anomaly_scores

                    threshold = (
                        np.percentile(anomaly_scores, 95)
                        if len(anomaly_scores) > 0 else 0
                    )
                    df['IS_ANOMALY'] = df['ANOMALY_SCORE'] > threshold

                    logger.info(
                        f"Detected {df['IS_ANOMALY'].sum()} anomalies in training data "
                        f"(threshold={threshold:.2f})"
                    )

                    if hasattr(model, 'named_steps'):
                        model.named_steps['detector'].anomaly_threshold_ = threshold
                    else:
                        model.anomaly_threshold_ = threshold  #type:ignore

                except Exception as e:
                    logger.error(f"Error calculating anomaly scores: {e}")

            return model

        except Exception as e:
            error_msg = f'Error in anomaly detection: {e}'
            logger.error(error_msg)
            return None
