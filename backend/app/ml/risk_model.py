from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer

from backend.app.utils.logger import logger
from backend.app.utils.model_file_utils import file_utils


class RiskModel:
    def train_ml_model(self, df):
        try:
            logger.info('Training machine learning models on attendance data...')
            models = {}

            feature_cols = []

            if all(col in df.columns for col in ['Total_Days_Present', 'Total_Days_Enrolled']):
                df = df.copy()
                df.loc[:, 'ATTENDANCE_RATE'] = (
                    df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
                )
                feature_cols.append('ATTENDANCE_RATE')

            if all(col in df.columns for col in ['Total_Days_Unexcused_Absent', 'Total_Days_Enrolled']):
                df.loc[:, 'UNEXCUSED_ABSENT_RATE'] = (
                    df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
                )
                feature_cols.append('UNEXCUSED_ABSENT_RATE')

            demo_cols = [
                'ECONOMIC_CODE',
                'SPECIAL_ED_CODE',
                'ENG_PROF_CODE',
                'HISPANIC_IND',
                'STUDENT_GRADE_LEVEL'
            ]
            for col in demo_cols:
                if col in df.columns:
                    df[col] = df[col].fillna('MISSING').astype(str)
                    feature_cols.append(col)

            if not feature_cols:
                raise ValueError("No valid features found for model training")

            logger.info(f'Using {len(feature_cols)} features for ML models: {feature_cols}')

            X = df[feature_cols].copy()
            numeric_cols = X.select_dtypes(include=['number']).columns.tolist()
            categorical_cols = list(set(feature_cols) - set(numeric_cols))

            numeric_transformer = Pipeline(steps=[
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler())
            ])

            categorical_transformer = Pipeline(steps=[
                ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
                ('onehot', OneHotEncoder(handle_unknown='ignore'))
            ])

            preprocessor = ColumnTransformer(
                transformers=[
                    ('num', numeric_transformer, numeric_cols),
                    ('cat', categorical_transformer, categorical_cols)
                ]
            )

            if 'ATTENDANCE_RATE' in df.columns:
                threshold = 85
                y_risk = (df['ATTENDANCE_RATE'] < threshold).astype(int)
                logger.info(f'Using ATTENDANCE_RATE with threshold {threshold}% as training target')
                logger.info(f'Class distribution: {y_risk.value_counts().to_dict()}')
            else:
                raise ValueError("No valid target variable found for model training")

            if len(X) < 50:
                raise ValueError(f'Not enough samples for training. Got {len(X)} samples, need at least 50')

            model = file_utils.load_model('risk_predictor')

            if model is None:
                logger.info("Training new risk predictor model...")
                model = Pipeline(steps=[
                    ('preprocessor', preprocessor),
                    ('classifier', RandomForestClassifier(
                        n_estimators=200,
                        max_depth=10,
                        min_samples_split=5,
                        class_weight='balanced',
                        random_state=42,
                        n_jobs=-1
                    ))
                ])

                model.fit(X, y_risk)
                file_utils.save_model(model, 'risk_predictor')
                logger.info("Successfully trained and saved new model")
            else:
                logger.info("Using cached risk predictor model")

            models['risk_predictor'] = model
            models['feature_columns'] = feature_cols

            models['imputer'] = SimpleImputer(strategy='median')
            models['imputer'].fit(X[numeric_cols])

            models['scaler'] = StandardScaler()
            X_imputed = models['imputer'].transform(X[numeric_cols])
            models['scaler'].fit(X_imputed)

            if hasattr(model.named_steps['classifier'], 'feature_importances_'): # type:ignore
                try:
                    ohe = (
                        model.named_steps['preprocessor'] # type:ignore
                            .named_transformers_['cat']
                            .named_steps['onehot']
                    )
                    cat_features = ohe.get_feature_names_out(categorical_cols)
                    all_features = numeric_cols + list(cat_features)
                    importances = model.named_steps['classifier'].feature_importances_ # type:ignore
                    feature_importance = dict(zip(all_features, importances))
                    feature_importance = dict(
                        sorted(
                            feature_importance.items(),
                            key=lambda x: x[1],
                            reverse=True
                        )[:20]
                    )
                    models['feature_importance'] = feature_importance
                    logger.info(f'Top features: {feature_importance}')
                except Exception as e:
                    logger.warning(f"Could not extract feature importance: {e}")

            logger.info('ML model training completed successfully')
            return models

        except Exception as e:
            error_msg = f'Error training ML models: {e}'
            logger.error(error_msg)
            raise Exception(error_msg)

