import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.cluster import KMeans


from backend.app.utils.logger import logger
from backend.app.utils.model_file_utils import FileUtils
from backend.app.data_store import data_store


class ClusterModel:
    def train_clustering(self, df):
        try:
            logger.info('Training clustering model...')

            features = []

            if all(col in df.columns for col in ['Total_Days_Present', 'Total_Days_Enrolled']):
                df = df.copy()
                df.loc[:, 'ATTENDANCE_RATE'] = (
                    df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
                )
                features.append('ATTENDANCE_RATE')

                if 'Prior_Attendance_Rate' in df.columns:
                    df.loc[:, 'ATTENDANCE_TREND'] = (
                        df['ATTENDANCE_RATE'] - df['Prior_Attendance_Rate']
                    )
                    features.append('ATTENDANCE_TREND')

            if all(col in df.columns for col in ['Total_Days_Unexcused_Absent', 'Total_Days_Enrolled']):
                df.loc[:, 'UNEXCUSED_ABSENT_RATE'] = (
                    df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
                )
                features.append('UNEXCUSED_ABSENT_RATE')

            demographic_features = [
                'ECONOMIC_CODE',
                'SPECIAL_ED_CODE',
                'ENG_PROF_CODE',
                'HISPANIC_IND',
                'STUDENT_GRADE_LEVEL'
            ]
            for col in demographic_features:
                if col in df.columns:
                    df[col] = df[col].fillna('MISSING').astype(str)
                    features.append(col)

            if not features:
                raise ValueError("No valid features available for clustering")

            logger.info(f'Using {len(features)} features for clustering: {features}')

            X = df[features].copy()

            numeric_cols = X.select_dtypes(include=['number']).columns.tolist()
            categorical_cols = list(set(features) - set(numeric_cols))

            numeric_transformer = Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler())
            ])

            categorical_transformer = Pipeline([
                ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
                ('onehot', OneHotEncoder(handle_unknown='ignore'))
            ])

            preprocessor = ColumnTransformer(
                transformers=[
                    ('num', numeric_transformer, numeric_cols),
                    ('cat', categorical_transformer, categorical_cols)
                ]
            )

            X_processed = preprocessor.fit_transform(X)

            n_samples = X_processed.shape[0] if hasattr(X_processed, 'shape') else len(X_processed)  #type:ignore
            if n_samples < 10:
                raise ValueError(f"Insufficient data for clustering. Need at least 10 samples, got {n_samples}")

            max_clusters = min(10, n_samples // 5)
            if max_clusters < 2:
                n_clusters = 2
                logger.info(f"Using minimum number of clusters: {n_clusters}")
            else:
                logger.info(f"Determining optimal number of clusters (max: {max_clusters})...")
                distortions = []
                K = range(1, max_clusters + 1)

                for k in K:
                    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
                    kmeans.fit(X_processed)
                    distortions.append(kmeans.inertia_)

                if len(distortions) > 2:
                    try:
                        deltas = np.diff(distortions, 2)
                        n_clusters = np.argmax(deltas) + 2
                        n_clusters = max(2, min(n_clusters, max_clusters))
                        logger.info(f"Optimal number of clusters determined: {n_clusters}")
                    except Exception:
                        logger.warning("Error in elbow method. Using default of 3 clusters.")
                        n_clusters = 3
                else:
                    logger.warning("Not enough points for elbow method. Using default of 3 clusters.")
                    n_clusters = 3

            file_utils = FileUtils()
            model_path = file_utils.get_model_filename('cluster_model')

            if os.path.exists(model_path):
                model = file_utils.load_model('cluster_model')
            else:
                model = None

            if model is None or True:
                logger.info(f"Training new clustering model with {n_clusters} clusters...")

                model = Pipeline([
                    ('preprocessor', preprocessor),
                    ('cluster', KMeans(n_clusters=n_clusters, random_state=42, n_init=10, verbose=1))
                ])

                model.fit(X)
                file_utils.save_model(model, 'cluster_model')
                logger.info("Successfully trained and saved new clustering model")


            data_store.ml_models['cluster_model'] = model

            cluster_assignments = model.named_steps['cluster'].labels_
            df['CLUSTER'] = cluster_assignments

            cluster_stats = {}
            for cluster_id in range(n_clusters):
                cluster_data = df[df['CLUSTER'] == cluster_id]
                stats = {
                    'size': len(cluster_data),
                    'percentage': len(cluster_data) / len(df) * 100
                }

                for feature in numeric_cols:
                    if pd.api.types.is_numeric_dtype(df[feature]):
                        stats[f'mean_{feature}'] = float(cluster_data[feature].mean())

                for feature in categorical_cols:
                    if feature in df.columns:
                        mode = cluster_data[feature].mode()
                        stats[f'mode_{feature}'] = mode[0] if not mode.empty else None

                cluster_stats[f'cluster_{cluster_id}'] = stats

            logger.info(f'Clustering completed. Cluster sizes: {[stats["size"] for stats in cluster_stats.values()]}')

            cluster_insights = {
                'cluster_features': features,
                'n_clusters': n_clusters,
                'cluster_stats': cluster_stats,
                'n_samples': len(df),
                'features_used': X.shape[1]
            }

            return model, cluster_insights

        except Exception as e:
            error_msg = f'Error in clustering: {e}'
            logger.error(error_msg)
            return {'error': error_msg}

