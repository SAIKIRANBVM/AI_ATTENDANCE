import pandas as pd

from backend.app.utils.logger import logger
from backend.app.data_store import data_store



def apply_ai_predictions_to_dataset(df):
    try:
        df['AI_RISK_SCORE'] = df.get('RISK_SCORE', 0)

        if 'risk_predictor' in data_store.ml_models and 'feature_columns' in data_store.ml_models:
            try:
                feature_cols = data_store.ml_models['feature_columns']
                missing_cols = [col for col in feature_cols if col not in df.columns]

                if missing_cols:
                    df['PREDICTED_RISK_PROBABILITY'] = df['RISK_SCORE'] / 100
                else:
                    X = df[feature_cols].copy()
                    X = X.fillna(X.mean())

                    if 'imputer' in data_store.ml_models and 'scaler' in data_store.ml_models:
                        X_imputed = data_store.ml_models['imputer'].transform(X[feature_cols])
                        X_scaled = data_store.ml_models['scaler'].transform(X_imputed)

                        risk_predictor = data_store.ml_models['risk_predictor']

                        if hasattr(risk_predictor, 'predict_proba'):
                            risk_probas = risk_predictor.predict_proba(X_scaled)
                            df['PREDICTED_RISK_PROBABILITY'] = risk_probas[:, 1]
                        else:
                            df['PREDICTED_RISK_PROBABILITY'] = risk_predictor.predict(X_scaled)

                        df['AI_RISK_SCORE'] = (
                            0.5 * df['RISK_SCORE'] +
                            0.5 * (100 * df['PREDICTED_RISK_PROBABILITY'])
                        )

            except Exception as e:
                logger.error(f"Error in risk prediction: {e}")
                df['PREDICTED_RISK_PROBABILITY'] = df['RISK_SCORE'] / 100
                df['AI_RISK_SCORE'] = df['RISK_SCORE']
        else:
            logger.warning('Risk predictor model not available, using fallback risk assessment')
            df['PREDICTED_RISK_PROBABILITY'] = df['RISK_SCORE'] / 100
            df['AI_RISK_SCORE'] = df['RISK_SCORE']

        if hasattr(data_store, 'anomaly_detector') and data_store.anomaly_detector is not None:
            try:
                features_to_use = []

                if 'Total_Days_Present' in df.columns and 'Total_Days_Enrolled' in df.columns:
                    df['ATTENDANCE_RATE'] = (
                        df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
                    )
                    features_to_use.append('ATTENDANCE_RATE')

                if 'Total_Days_Unexcused_Absent' in df.columns and 'Total_Days_Enrolled' in df.columns:
                    df['UNEXCUSED_ABSENT_RATE'] = (
                        df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
                    )
                    features_to_use.append('UNEXCUSED_ABSENT_RATE')

                if not features_to_use:
                    logger.warning('No valid features available for anomaly detection')
                    return df

                logger.info(f'Using features for anomaly detection: {features_to_use}')

                X_anomaly = df[features_to_use].copy()

                if hasattr(data_store.anomaly_detector, 'score_samples'):
                    try:
                        df['ANOMALY_SCORE'] = -data_store.anomaly_detector.score_samples(X_anomaly)

                        min_score = df['ANOMALY_SCORE'].min()
                        max_score = df['ANOMALY_SCORE'].max()
                        if max_score > min_score:
                            df['ANOMALY_SCORE'] = (
                                100 *
                                (df['ANOMALY_SCORE'] - min_score) /
                                (max_score - min_score)
                            )

                        threshold = df['ANOMALY_SCORE'].quantile(0.95)
                        df['IS_ANOMALY'] = df['ANOMALY_SCORE'] >= threshold

                        logger.info(
                            f'Anomaly detection completed. Found '
                            f'{df["IS_ANOMALY"].sum()} anomalies '
                            f'(threshold={threshold:.2f})'
                        )

                    except Exception as e:
                        logger.error(f"Error in anomaly scoring: {e}")

            except Exception as e:
                logger.error(f"Error in anomaly detection: {e}")

        df['AI_RISK_LEVEL'] = pd.cut(
            df['AI_RISK_SCORE'],
            bins=[0, 20, 40, 60, 80, 100],
            labels=['Very Low', 'Low', 'Medium', 'High', 'Critical'],
            duplicates='drop'
        )

        logger.info('AI predictions applied to dataset successfully')

    except Exception as e:
        logger.error(f"Error in apply_ai_predictions_to_dataset: {e}")
        raise
