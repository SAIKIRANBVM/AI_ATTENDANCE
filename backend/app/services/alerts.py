from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.openapi.utils import get_openapi
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler, RobustScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.cluster import KMeans
from sklearn.manifold import TSNE
import joblib
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import os
from functools import lru_cache, wraps
import hashlib
import json
from fastapi import Request
import traceback
import asyncio
import logging
import io
import time
import threading
import concurrent.futures
from contextlib import asynccontextmanager
import pyarrow as pa
import pyarrow.parquet as pq

from backend.classes.SummaryStatistics import SummaryStatistics
from backend.classes.AnalysisResponse import AnalysisResponse
from backend.classes.AnalysisSearchCriteria import AnalysisSearchCriteria
from backend.classes.DownloadReportCriteria import DownloadReportCriteria
from backend.classes.FilterOptions import FilterOptions
from backend.classes.Recommendation import Recommendation
from backend.classes.KeyInsight import KeyInsight
from backend.classes.GradeResponse import GradeResponse
from backend.classes.SchoolOption import SchoolOption
from backend.classes.ValueLabelPair import ValueLabelPair


 
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('attendance_api')

CURRENT_SCHOOL_YEAR = 2024

class DataStore:
    df = None
    last_loaded = None
    loading = False
    load_error = None
    indices = {}
    is_ready = False
    ml_models = {}
    anomaly_detector = None
    cluster_model = None
    feature_importance = None
    prediction_cache = {}
    anomaly_feature_columns = None
data_store = DataStore()

@asynccontextmanager
async def lifespan(app: FastAPI):
    background_thread = threading.Thread(target=load_and_process_data)
    background_thread.daemon = True
    background_thread.start()
    logger.info('Starting data loading in background...')
    yield
    logger.info('Shutting down application')
app = FastAPI(title='AI-Powered Attendance Analysis API', description='\n    This API provides AI-driven attendance analysis with predictive modeling and anomaly detection.\n    It includes endpoints for downloading various reports and analyzing student attendance patterns\n    using machine learning for early intervention recommendations.\n    ', version='2.0.0', docs_url='/docs', redoc_url='/redoc', lifespan=lifespan)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(title='Attendance Analysis API', version='1.2.0', description='API for analyzing and reporting student attendance patterns with filtering', routes=app.routes)
    app.openapi_schema = openapi_schema
    return app.openapi_schema
app.openapi = custom_openapi
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'], expose_headers=['Content-Disposition', 'Content-Type', 'Content-Length'], max_age=3600)

@app.middleware('http')
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

def load_and_process_data():
    """Load and process data in background with AI model training"""
    try:
        data_store.loading = True
        data_store.is_ready = False
        data_store.load_error = None
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
            current_year_df = df[df['SCHOOL_YEAR'] == int(CURRENT_SCHOOL_YEAR)]
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
        logger.info(f'Processing {len(df)} unique student records for AI models...')
        with concurrent.futures.ThreadPoolExecutor() as executor:
            predictions_future = executor.submit(lambda: df['Predictions'].values)
            predictions = predictions_future.result()
            df['RISK_SCORE'] = 100 - predictions
            df['RISK_LEVEL'] = pd.cut(df['RISK_SCORE'], bins=[0, 20, 40, 60, 80, 100], labels=['Very Low', 'Low', 'Medium', 'High', 'Critical'])
            df['Predicted_Attendance'] = predictions
            df['TIER'] = df['Predicted_Attendance'].apply(assign_tiers)
            train_ml_models_future = executor.submit(train_ml_models, df)
            train_anomaly_detector_future = executor.submit(train_anomaly_detector, df)
            train_clustering_future = executor.submit(train_clustering, df)
            data_store.ml_models = train_ml_models_future.result()
            data_store.anomaly_detector = train_anomaly_detector_future.result()
            data_store.cluster_model, data_store.cluster_insights = train_clustering_future.result()
        logger.info('Creating indices for faster filtering...')
        data_store.indices = {'DISTRICT_NAME': df['DISTRICT_NAME'].str.upper().to_dict(), 'STUDENT_GRADE_LEVEL': df['STUDENT_GRADE_LEVEL'].astype(str).to_dict()}
        if 'SCHOOL_NAME' in df.columns:
            data_store.indices['SCHOOL_NAME'] = df['SCHOOL_NAME'].str.upper().to_dict()
        logger.info('Applying AI predictions to the dataset...')
        # Ensure we have the dataframe with all features before applying predictions
        if 'ATTENDANCE_RATE' not in df.columns and 'Total_Days_Present' in df.columns and 'Total_Days_Enrolled' in df.columns:
            df['ATTENDANCE_RATE'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
            
        # Apply predictions
        apply_ai_predictions_to_dataset(df)
        
        # Store the processed dataframe
        data_store.df = df
        
        # Verify models are properly stored
        if 'risk_predictor' not in data_store.ml_models:
            logger.warning('Risk predictor model still not available after training. Checking for cached model...')
            # Try to load the model directly if training failed
            model = load_model('risk_predictor')
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
        logger.error(traceback.format_exc())
        data_store.load_error = str(e)
    finally:
        data_store.loading = False
        return df

MODEL_CACHE_DIR = "model_cache"
os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

def get_model_filename(model_name: str) -> str:
    """Get the filename for a cached model"""
    return os.path.join(MODEL_CACHE_DIR, f"{model_name}.joblib")

def save_model(model, model_name: str):
    """Save a model to disk using joblib"""
    filename = get_model_filename(model_name)
    joblib.dump(model, filename)
    logger.info(f"Saved model to {filename}")

def load_model(model_name: str):
    """Load a model from disk using joblib"""
    filename = get_model_filename(model_name)
    try:
        if not os.path.exists(filename):
            logger.info(f'No saved {model_name} found at {filename}')
            return None
            
        # Check file size to avoid loading empty or corrupted files
        if os.path.getsize(filename) == 0:
            logger.warning(f'Found empty model file: {filename}. Removing it.')
            os.remove(filename)
            return None
            
        logger.info(f'Loading model from {filename}')
        model = joblib.load(filename)
        logger.info(f'Successfully loaded {model_name} from {filename}')
        
        # If this is a clustering model, return additional insights
        if model_name == 'cluster_model':
            if hasattr(model, 'named_steps') and 'cluster' in model.named_steps:
                kmeans = model.named_steps['cluster']
                n_clusters = kmeans.n_clusters
                features = kmeans.cluster_centers_.shape[1] if hasattr(kmeans, 'cluster_centers_') else 'unknown'
            elif hasattr(model, 'n_clusters'):
                n_clusters = model.n_clusters
                features = model.cluster_centers_.shape[1] if hasattr(model, 'cluster_centers_') else 'unknown'
            else:
                n_clusters = 'unknown'
                features = 'unknown'
                
            cluster_insights = {
                'n_clusters': n_clusters,
                'features_used': features
            }
            return model, cluster_insights
            
        return model
        
    except Exception as e:
        error_msg = f'Error loading {model_name} from {filename}: {str(e)}'
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        # If there's an error loading the model, delete the corrupted file
        try:
            if os.path.exists(filename):
                os.remove(filename)
                logger.warning(f'Removed corrupted model file: {filename}')
        except Exception as e2:
            logger.error(f'Error removing corrupted model file {filename}: {str(e2)}')
        return None

def train_ml_models(df):
    """Train machine learning models for predictive analytics using new column structure"""
    try:
        logger.info('Training machine learning models on attendance data...')
        models = {}
        
        # 1. Feature Engineering
        feature_cols = []
        
        # Basic attendance features (exclude any prediction columns to prevent data leakage)
        if all(col in df.columns for col in ['Total_Days_Present', 'Total_Days_Enrolled']):
            df = df.copy()  # Avoid SettingWithCopyWarning
            df.loc[:, 'ATTENDANCE_RATE'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
            feature_cols.append('ATTENDANCE_RATE')
            
        if all(col in df.columns for col in ['Total_Days_Unexcused_Absent', 'Total_Days_Enrolled']):
            df.loc[:, 'UNEXCUSED_ABSENT_RATE'] = df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
            feature_cols.append('UNEXCUSED_ABSENT_RATE')
        
        # Demographic features (one-hot encode categorical variables)
        demo_cols = ['ECONOMIC_CODE', 'SPECIAL_ED_CODE', 'ENG_PROF_CODE', 'HISPANIC_IND', 'STUDENT_GRADE_LEVEL']
        for col in demo_cols:
            if col in df.columns:
                # Convert to string and handle missing values
                df[col] = df[col].fillna('MISSING').astype(str)
                feature_cols.append(col)
        
        if not feature_cols:
            raise ValueError("No valid features found for model training")
            
        logger.info(f'Using {len(feature_cols)} features for ML models: {feature_cols}')
        
        # 2. Prepare features and target
        X = df[feature_cols].copy()
        
        # Separate numeric and categorical features
        numeric_cols = X.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = list(set(feature_cols) - set(numeric_cols))
        
        # Create preprocessing pipeline
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
            ])
        
        # 3. Prepare target variable - use ATTENDANCE_RATE since it's already calculated
        if 'ATTENDANCE_RATE' in df.columns:
            threshold = 85
            y_risk = (df['ATTENDANCE_RATE'] < threshold).astype(int)
            logger.info(f'Using ATTENDANCE_RATE with threshold {threshold}% as training target')
            logger.info(f'Class distribution: {y_risk.value_counts().to_dict()}')
        else:
            raise ValueError("No valid target variable found for model training")
        
        if len(X) < 50:
            raise ValueError(f'Not enough samples for training. Got {len(X)} samples, need at least 50')
        
        # 4. Train or load model
        model = load_model('risk_predictor')
        
        if model is None or True:  # Set to False to use cached model
            logger.info("Training new risk predictor model...")
            
            # Create and train the model pipeline
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
            
            # Train the model
            model.fit(X, y_risk)
            save_model(model, 'risk_predictor')
            logger.info("Successfully trained and saved new model")
        else:
            logger.info("Using cached risk predictor model")
        
        # 5. Store model and feature importance
        models = {}
        models['risk_predictor'] = model
        models['feature_columns'] = feature_cols
        
        # Store imputer and scaler for later use
        models['imputer'] = SimpleImputer(strategy='median')
        models['imputer'].fit(X[numeric_cols])
        
        models['scaler'] = StandardScaler()
        X_imputed = models['imputer'].transform(X[numeric_cols])
        models['scaler'].fit(X_imputed)
        
        # Get feature importance (for numeric features)
        if hasattr(model.named_steps['classifier'], 'feature_importances_'):
            try:
                # Get one-hot encoded feature names
                ohe = model.named_steps['preprocessor'].named_transformers_['cat'].named_steps['onehot']
                cat_features = ohe.get_feature_names_out(categorical_cols)
                
                # Combine numeric and categorical feature names
                all_features = numeric_cols + list(cat_features)
                
                # Get importances
                importances = model.named_steps['classifier'].feature_importances_
                feature_importance = dict(zip(all_features, importances))
                
                # Sort by importance
                feature_importance = dict(sorted(feature_importance.items(), 
                                               key=lambda x: x[1], 
                                               reverse=True)[:20])  # Top 20 features
                
                models['feature_importance'] = feature_importance
                logger.info(f'Top features: {feature_importance}')
            except Exception as e:
                logger.warning(f"Could not extract feature importance: {str(e)}")
        
        logger.info('ML model training completed successfully')
        return models
        
    except Exception as e:
        error_msg = f'Error training ML models: {str(e)}'
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        raise Exception(error_msg)

def train_anomaly_detector(df, force_retrain=True):
    """
    Train an Isolation Forest model to detect anomalous attendance patterns.
    Anomalies could indicate data quality issues or students with unusual attendance patterns.
    
    Args:
        df: DataFrame containing the training data
        force_retrain: If True, force retraining even if a model exists
        
    Returns:
        The trained anomaly detection model or None if training fails
    """
    try:
        logger.info('Training anomaly detection model...')
        
        # Clean up any existing model to ensure fresh training
        try:
            model_path = os.path.join('model_cache', 'anomaly_detector.joblib')
            if os.path.exists(model_path):
                os.remove(model_path)
                logger.info('Removed existing model to ensure clean retrain')
        except Exception as e:
            logger.warning(f'Could not remove existing model: {str(e)}')
        
        # 1. Feature Engineering - Only use the features we want to keep
        features = []
        df = df.copy()
        
        # Calculate attendance rate if we have the required columns
        if all(col in df.columns for col in ['Total_Days_Present', 'Total_Days_Enrolled']):
            df['ATTENDANCE_RATE'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
            features.append('ATTENDANCE_RATE')
        
        # Calculate unexcused absence rate if we have the required columns
        if all(col in df.columns for col in ['Total_Days_Unexcused_Absent', 'Total_Days_Enrolled']):
            df['UNEXCUSED_ABSENT_RATE'] = df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
            features.append('UNEXCUSED_ABSENT_RATE')
            
        # Ensure we have at least one feature to work with
        if not features:
            raise ValueError("No valid features available for anomaly detection. Need either attendance data or unexcused absence data.")
        
        if not features:
            raise ValueError("No valid features available for anomaly detection")
            
        logger.info(f'Using {len(features)} features for anomaly detection: {features}')
        
        # 2. Prepare data
        X = df[features].copy()
        
        # Handle missing values and scale features
        numeric_transformer = Pipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', RobustScaler())  # More robust to outliers than StandardScaler
        ])
        
        X_processed = numeric_transformer.fit_transform(X)
        
        if len(X_processed) < 20:
            raise ValueError(f"Insufficient data for anomaly detection. Need at least 20 samples, got {len(X_processed)}")
        
        # 3. Create a DataFrame to preserve feature names
        X_df = pd.DataFrame(X, columns=features)
        
        # 4. Force retrain to ensure we use only the desired features
        model = None  # Force retrain by not loading existing model
        force_retrain = True
        
        if model is None or force_retrain:  # Always retrain to ensure clean feature set
            logger.info("Training new anomaly detection model...")
            
            # Determine contamination (proportion of outliers) - auto-detect if possible
            contamination = min(0.1, 5.0 / len(X_processed))  # Max 10% or 5 samples, whichever is smaller
            
            # Create a new pipeline that maintains feature names
            model = Pipeline([
                ('preprocessor', numeric_transformer),
                ('detector', IsolationForest(
                    n_estimators=100,  # Reduced from 200 for faster training
                    contamination=contamination,
                    random_state=42,
                    n_jobs=-1,
                    verbose=1
                ))
            ])
            
            # Fit the model with DataFrame to store feature names
            model.fit(X_df)
            
            # Save the trained model
            save_model(model, 'anomaly_detector')
            logger.info(f"Trained new anomaly detector with features: {features}, contamination={contamination:.2f}")
        else:
            logger.info("Using cached anomaly detection model")
        
        # 5. Store model and return results
        # Store the actual model in data_store.anomaly_detector
        data_store.anomaly_detector = model
        
        # Also store the feature columns for later use
        data_store.anomaly_feature_columns = features
        
        # Calculate anomaly scores for the training data
        if len(X_df) > 0:
            try:
                # Use the full pipeline to get anomaly scores (includes preprocessing)
                anomaly_scores = -model.score_samples(X_df)  # Use the full pipeline for scoring
                df['ANOMALY_SCORE'] = anomaly_scores
                
                # Calculate threshold (top 5% are anomalies)
                threshold = np.percentile(anomaly_scores, 95) if len(anomaly_scores) > 0 else 0
                df['IS_ANOMALY'] = df['ANOMALY_SCORE'] > threshold
                
                # Log some info about anomalies
                logger.info(f"Detected {df['IS_ANOMALY'].sum()} anomalies in training data "
                          f"(threshold={threshold:.2f})")
                
                # Store the threshold in the model's metadata
                if hasattr(model, 'named_steps'):
                    model.named_steps['detector'].anomaly_threshold_ = threshold
                else:
                    model.anomaly_threshold_ = threshold
            except Exception as e:
                logger.error(f"Error calculating anomaly scores: {str(e)}")
                logger.error(traceback.format_exc())
        
        # Return the model itself, not a dictionary
        return model
        
    except Exception as e:
        error_msg = f'Error in anomaly detection: {str(e)}'
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return None

def train_clustering(df):
    """
    Train a clustering model to identify groups of students with similar attendance patterns.
    Uses K-means clustering with automatic determination of optimal number of clusters.
    """
    try:
        logger.info('Training clustering model...')
        
        # 1. Feature Engineering
        features = []
        
        # Attendance metrics
        if all(col in df.columns for col in ['Total_Days_Present', 'Total_Days_Enrolled']):
            df = df.copy()
            df.loc[:, 'ATTENDANCE_RATE'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
            features.append('ATTENDANCE_RATE')
            
            # Add trend if available
            if 'Prior_Attendance_Rate' in df.columns:
                df.loc[:, 'ATTENDANCE_TREND'] = df['ATTENDANCE_RATE'] - df['Prior_Attendance_Rate']
                features.append('ATTENDANCE_TREND')
        
        # Absence patterns
        if all(col in df.columns for col in ['Total_Days_Unexcused_Absent', 'Total_Days_Enrolled']):
            df.loc[:, 'UNEXCUSED_ABSENT_RATE'] = df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
            features.append('UNEXCUSED_ABSENT_RATE')
        
        # # Tardy patterns if available
        # if all(col in df.columns for col in ['Total_Days_Tardy', 'Total_Days_Enrolled']):
        #     df.loc[:, 'TARDY_RATE'] = df['Total_Days_Tardy'] / df['Total_Days_Enrolled'] * 100
        #     features.append('TARDY_RATE')
        
        # Add demographic features (one-hot encoded)
        demographic_features = ['ECONOMIC_CODE', 'SPECIAL_ED_CODE', 'ENG_PROF_CODE', 'HISPANIC_IND', 'STUDENT_GRADE_LEVEL']
        for col in demographic_features:
            if col in df.columns:
                # Convert to string and handle missing values
                df[col] = df[col].fillna('MISSING').astype(str)
                features.append(col)
        
        if not features:
            raise ValueError("No valid features available for clustering")
            
        logger.info(f'Using {len(features)} features for clustering: {features}')
        
        # 2. Prepare data
        X = df[features].copy()
        
        # Separate numeric and categorical features
        numeric_cols = X.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = list(set(features) - set(numeric_cols))
        
        # Create preprocessing pipeline
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
            ])
        
        X_processed = preprocessor.fit_transform(X)
        
        # Handle both sparse and dense matrices
        n_samples = X_processed.shape[0] if hasattr(X_processed, 'shape') else len(X_processed)
        if n_samples < 10:
            raise ValueError(f"Insufficient data for clustering. Need at least 10 samples, got {n_samples}")
        
        # 3. Determine optimal number of clusters using elbow method
        max_clusters = min(10, n_samples // 5)  # At least 5 samples per cluster
        if max_clusters < 2:
            n_clusters = 2
            logger.info(f"Using minimum number of clusters: {n_clusters}")
        else:
            logger.info(f"Determining optimal number of clusters (max: {max_clusters})...")
            distortions = []
            K = range(1, max_clusters + 1)
            
            for k in K:
                kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)  # Removed n_jobs parameter
                kmeans.fit(X_processed)
                distortions.append(kmeans.inertia_)
            
            # Find the "elbow" point
            if len(distortions) > 2:  # Need at least 3 points to calculate second derivative
                try:
                    deltas = np.diff(distortions, 2)  # Second derivative
                    n_clusters = np.argmax(deltas) + 2  # +2 because of the second derivative
                    n_clusters = max(2, min(n_clusters, max_clusters))
                    logger.info(f"Optimal number of clusters determined: {n_clusters}")
                except Exception as e:
                    logger.warning(f"Error in elbow method: {str(e)}. Using default of 3 clusters.")
                    n_clusters = 3
            else:
                logger.warning("Not enough points for elbow method. Using default of 3 clusters.")
                n_clusters = 3
        
        # 4. Train or load model
        model = load_model('cluster_model')
        
        if model is None or True:  # Set to False to use cached model
            logger.info(f"Training new clustering model with {n_clusters} clusters...")
            
            model = Pipeline([
                ('preprocessor', preprocessor),
                ('cluster', KMeans(
                    n_clusters=n_clusters,
                    random_state=42,
                    n_init=10,
                    verbose=1
                ))
            ])
            
            # Fit the model
            model.fit(X)
            save_model(model, 'cluster_model')
            logger.info("Successfully trained and saved new clustering model")
        else:
            logger.info("Using cached clustering model")
        
        # 5. Store model and analyze clusters
        data_store.ml_models['cluster_model'] = model
        
        # Get cluster assignments and analyze each cluster
        cluster_assignments = model.named_steps['cluster'].labels_
        df['CLUSTER'] = cluster_assignments
        
        # Calculate cluster statistics
        cluster_stats = {}
        for cluster_id in range(n_clusters):
            cluster_data = df[df['CLUSTER'] == cluster_id]
            stats = {
                'size': len(cluster_data),
                'percentage': len(cluster_data) / len(df) * 100
            }
            
            # Add mean values for numeric features
            for feature in numeric_cols:
                if pd.api.types.is_numeric_dtype(df[feature]):
                    stats[f'mean_{feature}'] = float(cluster_data[feature].mean())
            
            # Add mode for categorical features
            for feature in categorical_cols:
                if feature in df.columns:
                    mode = cluster_data[feature].mode()
                    stats[f'mode_{feature}'] = mode[0] if not mode.empty else None
            
            cluster_stats[f'cluster_{cluster_id}'] = stats
        
        logger.info(f'Clustering completed. Cluster sizes: {[stats["size"] for stats in cluster_stats.values()]}')
        
        # Create cluster insights dictionary
        cluster_insights = {
            'cluster_features': features,
            'n_clusters': n_clusters,
            'cluster_stats': cluster_stats,
            'n_samples': len(df),
            'features_used': X.shape[1]
        }
        
        # Return both the model and insights
        return model, cluster_insights
        
    except Exception as e:
        error_msg = f'Error in clustering: {str(e)}'
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return {'error': error_msg}

def apply_ai_predictions_to_dataset(df):
    """Apply AI predictions to the dataset for risk forecasting and anomaly detection"""
    try:
        # Initialize default values
        df['AI_RISK_SCORE'] = df.get('RISK_SCORE', 0)
        
        # 1. Try to use the risk predictor model if available
        if 'risk_predictor' in data_store.ml_models and 'feature_columns' in data_store.ml_models:
            try:
                feature_cols = data_store.ml_models['feature_columns']
                missing_cols = [col for col in feature_cols if col not in df.columns]
                
                if missing_cols:
                    # Silent handling of missing columns
                    # Use fallback approach if critical columns are missing
                    df['PREDICTED_RISK_PROBABILITY'] = df['RISK_SCORE'] / 100  # Use existing risk score as fallback
                else:
                    # Prepare features
                    X = df[feature_cols].copy()
                    X = X.fillna(X.mean())
                    
                    # Apply imputer and scaler if available
                    if 'imputer' in data_store.ml_models and 'scaler' in data_store.ml_models:
                        X_imputed = data_store.ml_models['imputer'].transform(X[feature_cols])
                        X_scaled = data_store.ml_models['scaler'].transform(X_imputed)
                        
                        # Make predictions
                        risk_predictor = data_store.ml_models['risk_predictor']
                        
                        # Handle different model types (pipeline vs raw model)
                        if hasattr(risk_predictor, 'predict_proba'):
                            risk_probas = risk_predictor.predict_proba(X_scaled)
                            df['PREDICTED_RISK_PROBABILITY'] = risk_probas[:, 1]  # Probability of positive class
                        else:
                            df['PREDICTED_RISK_PROBABILITY'] = risk_predictor.predict(X_scaled)
                            
                        # Calculate combined risk score
                        df['AI_RISK_SCORE'] = 0.5 * df['RISK_SCORE'] + 0.5 * (100 * df['PREDICTED_RISK_PROBABILITY'])
                    
            except Exception as e:
                logger.error(f"Error in risk prediction: {str(e)}")
                logger.error(traceback.format_exc())
                # Fall back to using just the risk score
                df['PREDICTED_RISK_PROBABILITY'] = df['RISK_SCORE'] / 100
                df['AI_RISK_SCORE'] = df['RISK_SCORE']
        else:
            logger.warning('Risk predictor model not available, using fallback risk assessment')
            df['PREDICTED_RISK_PROBABILITY'] = df['RISK_SCORE'] / 100
            df['AI_RISK_SCORE'] = df['RISK_SCORE']
        
        # 2. Apply anomaly detection if model is available
        if hasattr(data_store, 'anomaly_detector') and data_store.anomaly_detector is not None:
            try:
                # Only use the features we want to keep
                features_to_use = []
                
                # Calculate required features if we have the data
                if 'Total_Days_Present' in df.columns and 'Total_Days_Enrolled' in df.columns:
                    df['ATTENDANCE_RATE'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
                    features_to_use.append('ATTENDANCE_RATE')
                
                if 'Total_Days_Unexcused_Absent' in df.columns and 'Total_Days_Enrolled' in df.columns:
                    df['UNEXCUSED_ABSENT_RATE'] = df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
                    features_to_use.append('UNEXCUSED_ABSENT_RATE')
                
                if not features_to_use:
                    logger.warning('No valid features available for anomaly detection')
                    return df
                
                logger.info(f'Using features for anomaly detection: {features_to_use}')
                
                # Prepare the features for prediction
                X_anomaly = df[features_to_use].copy()
                
                # Get anomaly scores using the full pipeline (includes preprocessing)
                if hasattr(data_store.anomaly_detector, 'score_samples'):
                    # The pipeline will handle all preprocessing
                    try:
                        df['ANOMALY_SCORE'] = -data_store.anomaly_detector.score_samples(X_anomaly)
                        
                        # Normalize scores to 0-100 range for consistency
                        min_score = df['ANOMALY_SCORE'].min()
                        max_score = df['ANOMALY_SCORE'].max()
                        if max_score > min_score:  # Avoid division by zero
                            df['ANOMALY_SCORE'] = 100 * (df['ANOMALY_SCORE'] - min_score) / (max_score - min_score)
                        
                        # Flag anomalies (top 5% of scores)
                        threshold = df['ANOMALY_SCORE'].quantile(0.95)
                        df['IS_ANOMALY'] = df['ANOMALY_SCORE'] >= threshold
                        
                        logger.info(f'Anomaly detection completed. Found {df["IS_ANOMALY"].sum()} anomalies (threshold={threshold:.2f})')
                    
                    except Exception as e:
                        logger.error(f"Error in anomaly scoring: {str(e)}")
                        logger.error(traceback.format_exc())
            
            except Exception as e:
                logger.error(f"Error in anomaly detection: {str(e)}")
                logger.error(traceback.format_exc())
        
        # 3. Finalize risk levels
        df['AI_RISK_LEVEL'] = pd.cut(
            df['AI_RISK_SCORE'], 
            bins=[0, 20, 40, 60, 80, 100], 
            labels=['Very Low', 'Low', 'Medium', 'High', 'Critical'],
            duplicates='drop'
        )
        
        logger.info('AI predictions applied to dataset successfully')
        
    except Exception as e:
        logger.error(f"Error in apply_ai_predictions_to_dataset: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def load_data():
    """Load data from Parquet file, falling back to Excel if needed"""
    try:
        # Define base directory and file paths
        base_dir = os.path.dirname(os.path.abspath(__file__))
        parquet_file = 'backend/data/Alerts.parquet'
        excel_file = os.path.join(base_dir, 'Predictions11.xlsx')
        
        logger.info("Attempting to load data...")
        
        # Try to load from Parquet first
        if os.path.exists(parquet_file):
            logger.info(f"Loading data from Parquet file: {parquet_file}")
            start_time = time.time()
            
            try:
                df = pd.read_parquet(parquet_file)
                parquet_load_time = time.time() - start_time
                logger.info(f"Successfully loaded {len(df)} rows from Parquet file in {parquet_load_time:.2f} seconds")
                return df
            except Exception as e:
                logger.error(f"Error loading Parquet file: {str(e)}")
                logger.error(traceback.format_exc())
                
        # If Parquet fails or doesn't exist, try Excel
        if os.path.exists(excel_file):
            logger.info(f"Loading data from Excel file: {excel_file}")
            start_time = time.time()
            
            try:
                # Use optimized Excel loading with specific dtypes
                df = pd.read_excel(
                    excel_file,
                    engine='openpyxl',
                    dtype={
                        'STUDENT_ID': str,
                        'DISTRICT_NAME': str,
                        'SCHOOL_NAME': str,
                        'STUDENT_GRADE_LEVEL': str,
                        'Total_Days_Present': float,
                        'Total_Days_Enrolled': float,
                        'SCHOOL_YEAR': str
                    }
                )
                
                excel_load_time = time.time() - start_time
                
                # Debug: Log grade column information after loading Excel
                grade_columns = [col for col in df.columns if 'grade' in col.lower() or 'level' in col.lower()]
                logger.info(f"Potential grade columns found: {grade_columns}")
                
                if 'STUDENT_GRADE_LEVEL' in df.columns:
                    logger.info(f"STUDENT_GRADE_LEVEL unique values: {df['STUDENT_GRADE_LEVEL'].dropna().unique().tolist()}")
                    logger.info(f"STUDENT_GRADE_LEVEL data type: {df['STUDENT_GRADE_LEVEL'].dtype}")
                    logger.info(f"Sample values (first 20): {df['STUDENT_GRADE_LEVEL'].head(20).tolist()}")
                elif 'GRADE_LEVEL' in df.columns:
                    logger.info(f"GRADE_LEVEL unique values: {df['GRADE_LEVEL'].dropna().unique().tolist()}")
                    logger.info(f"GRADE_LEVEL data type: {df['GRADE_LEVEL'].dtype}")
                    logger.info(f"Sample values (first 20): {df['GRADE_LEVEL'].head(20).tolist()}")
                
                # Log detailed information about the loaded data
                logger.info(f"Available columns: {df.columns.tolist()}")
                logger.info(f"First few values of SCHOOL_YEAR: {df['SCHOOL_YEAR'].head().tolist()}")
                logger.info(f"Unique values in SCHOOL_YEAR: {df['SCHOOL_YEAR'].unique()}")
                
                # Save as Parquet for future fast loading
                # Ensure grade column is string type before saving to Parquet
                if 'STUDENT_GRADE_LEVEL' in df.columns:
                    df['STUDENT_GRADE_LEVEL'] = df['STUDENT_GRADE_LEVEL'].astype(str).str.strip()
                elif 'GRADE_LEVEL' in df.columns:
                    df['GRADE_LEVEL'] = df['GRADE_LEVEL'].astype(str).str.strip()
                    
                # Log the grades after conversion
                grade_col = 'STUDENT_GRADE_LEVEL' if 'STUDENT_GRADE_LEVEL' in df.columns else 'GRADE_LEVEL'
                if grade_col in df.columns:
                    logger.info(f"Grades after string conversion. Unique values: {df[grade_col].dropna().unique().tolist()}")
                    logger.info(f"Grade value types after conversion: {df[grade_col].dtype}")
                
                # Convert Excel to Parquet for faster loading next time
                df.to_parquet(parquet_file, index=False, compression='snappy')
                save_time = time.time() - (start_time + excel_load_time)
                logger.info(f"Saved Parquet file in {save_time:.2f} seconds. Future loads will be much faster.")
                
                return df
            except Exception as e:
                logger.error(f"Error loading Excel file: {str(e)}")
                logger.error(traceback.format_exc())
        
        logger.error(f"No valid data file found at {base_dir}")
        return None
    except Exception as e:
        logger.error(f"Error loading data file: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def filter_data(df, district_code=None, school_code=None, grade_code=None):
    """Filter data based on provided parameters using optimized approach"""
    try:
        start_time = time.time()
        mask = pd.Series(True, index=df.index)
        logger.info(f'Starting with {len(df)} rows')
        logger.info(f'Available columns: {df.columns.tolist()}')
        
        # Make a copy to avoid SettingWithCopyWarning
        df = df.copy()
        
        # Define column mappings - map our expected column names to actual column names in the DataFrame
        column_mapping = {
            'DISTRICT_CODE': 'DISTRICT_CODE',
            'SCHOOL_CODE': 'LOCATION_ID',  # Use LOCATION_ID for school codes
            'GRADE_CODE': 'STUDENT_GRADE_LEVEL',  # Use STUDENT_GRADE_LEVEL for grades
            'DISTRICT_NAME': 'DISTRICT_NAME',
            'SCHOOL_NAME': 'SCHOOL_NAME',
            'GRADE_LEVEL': 'STUDENT_GRADE_LEVEL',  # Map to STUDENT_GRADE_LEVEL
            'STUDENT_ID': 'STUDENT_ID'
        }
        
        # Find actual column names that exist in the DataFrame
        actual_columns = {}
        for std_name, actual_name in column_mapping.items():
            if actual_name in df.columns:
                actual_columns[std_name] = actual_name
        
        logger.info(f'Found columns: {actual_columns}')
        
        # Convert code columns to strings if they exist
        for col in ['DISTRICT_CODE', 'SCHOOL_CODE', 'GRADE_CODE', 'STUDENT_ID']:
            if col in actual_columns and col in df.columns:
                df[col] = df[col].astype(str).str.strip()
        
        # Apply district filter
        if district_code and district_code.strip():
            district_code = str(district_code).strip()
            if 'DISTRICT_CODE' in actual_columns:
                # Extract just the numeric part if code starts with 'D'
                if district_code.upper().startswith('D'):
                    numeric_part = ''.join(filter(str.isdigit, district_code))
                    logger.info(f'Extracted numeric part from district code: {district_code} -> {numeric_part}')
                    mask &= df[actual_columns['DISTRICT_CODE']].astype(str).str.strip() == numeric_part
                else:
                    mask &= df[actual_columns['DISTRICT_CODE']].astype(str).str.strip() == district_code
                
                logger.info(f'After district code filter: {mask.sum()} rows remaining. ' \
                            f'Looking for: {district_code} (numeric part: {numeric_part if "numeric_part" in locals() else "N/A"}), ' \
                            f'Available: {df[actual_columns["DISTRICT_CODE"]].astype(str).str.strip().unique()[:10].tolist()}{"..." if len(df[actual_columns["DISTRICT_CODE"]].astype(str).str.strip().unique()) > 10 else ""}')
            elif 'DISTRICT_NAME' in actual_columns:
                # Fallback to name if code column doesn't exist
                mask &= df[actual_columns['DISTRICT_NAME']].astype(str).str.strip().str.upper() == district_code.upper()
                logger.info(f'After district name filter: {mask.sum()} rows remaining')
        
        # Apply school filter
        if school_code and school_code.strip() and mask.any():
            school_code = str(school_code).strip()
            if 'SCHOOL_CODE' in actual_columns:
                # Convert both to strings and strip whitespace for comparison
                mask &= df[actual_columns['SCHOOL_CODE']].astype(str).str.strip() == school_code
                logger.info(f'After school code filter: {mask.sum()} rows remaining. ' \
                          f'Looking for: {school_code}, ' \
                          f'Available: {df[actual_columns["SCHOOL_CODE"]].astype(str).str.strip().unique()[:10].tolist()}{"..." if len(df[actual_columns["SCHOOL_CODE"]].astype(str).str.strip().unique()) > 10 else ""}')
            elif 'SCHOOL_NAME' in actual_columns:
                # Fallback to name if code column doesn't exist
                mask &= df[actual_columns['SCHOOL_NAME']].astype(str).str.strip().str.upper() == school_code.upper()
                logger.info(f'After school name filter: {mask.sum()} rows remaining')
        
        # Apply grade filter
        if grade_code and grade_code.strip() and mask.any():
            grade_code = str(grade_code).strip()
            logger.info(f'Applying grade filter for grade: {grade_code}')
            
            # Log all unique grade values before filtering for debugging
            if 'GRADE_CODE' in actual_columns:
                all_grades = df[actual_columns['GRADE_CODE']].astype(str).str.strip()
                logger.info(f'All grade values in dataset (first 50): {sorted(all_grades.unique().tolist())[:50]}')
            
            # Normalize the input grade code
            try:
                # Handle special cases first
                normalized_grade = grade_code.upper()
                if normalized_grade in ['PK', 'PRE-K', 'PRE-KINDERGARTEN', '-1']:
                    normalized_grade = '-1'
                elif normalized_grade in ['K', 'KINDERGARTEN', '0']:
                    normalized_grade = '0'
                else:
                    # Extract just the numeric part for grades 1-12
                    normalized_grade = ''.join(filter(str.isdigit, grade_code))
                    normalized_grade = normalized_grade if normalized_grade else grade_code
                
                logger.info(f'Normalized grade code: {grade_code} -> {normalized_grade}')
                
                if 'GRADE_CODE' in actual_columns:
                    # Create a function to normalize grade values for comparison
                    def normalize_grade(g):
                        if pd.isna(g):
                            return None
                        g = str(g).strip().upper()
                        if g in ['PK', 'PRE-K', 'PRE-KINDERGARTEN', '-1']:
                            return '-1'
                        if g in ['K', 'KINDERGARTEN', '0']:
                            return '0'
                        # Extract just the numeric part for grades 1-12
                        nums = ''.join(filter(str.isdigit, g))
                        return nums if nums else g
                    
                    # Apply the normalization to the grade column
                    normalized_grades = df[actual_columns['GRADE_CODE']].apply(normalize_grade)
                    
                    # Apply the filter using the normalized values
                    mask &= normalized_grades == normalized_grade
                    
                    # Log detailed information about the filter results
                    logger.info(f'After grade code filter: {mask.sum()} rows remaining.')
                    logger.info(f'Looking for grade: {normalized_grade} (original: {grade_code})')
                    
                    # Log counts by grade for debugging
                    grade_counts = normalized_grades.value_counts().to_dict()
                    logger.info(f'Grade distribution in filtered data: {dict(sorted(grade_counts.items())[:20])}...')
                    
            except Exception as e:
                logger.error(f'Error processing grade filter: {str(e)}')
                logger.error(traceback.format_exc())
        else:
            logger.info('No grade filter applied')
        
        # Apply school year filter if column exists
        if 'SCHOOL_YEAR' in df.columns and mask.any():
            # Convert both to strings and strip whitespace for comparison
            mask &= (df['SCHOOL_YEAR'].astype(str).str.strip() == str(CURRENT_SCHOOL_YEAR))
            logger.info(f'After school year filter ({CURRENT_SCHOOL_YEAR}): {mask.sum()} rows remain')
            
            # Log a warning if no rows match the current school year
            if mask.sum() == 0 and len(df) > 0:
                unique_years = df['SCHOOL_YEAR'].astype(str).unique()
                logger.warning(f'No data found for current school year {CURRENT_SCHOOL_YEAR}. Available years: {unique_years}')
        
        # Apply the mask to get filtered DataFrame
        filtered_df = df[mask].copy()
        logger.info(f'Filtering completed in {time.time() - start_time:.4f} seconds, returning {len(filtered_df)} rows')
        
        # Log sample data if any rows match
        if len(filtered_df) > 0:
            logger.info(f'Sample filtered data (first row): {filtered_df.iloc[0].to_dict() if not filtered_df.empty else "No data"}')
            
            # Log unique values for important columns
            for col in ['DISTRICT_NAME', 'DISTRICT_CODE', 'SCHOOL_NAME', 'SCHOOL_CODE', 'GRADE_LEVEL', 'GRADE_CODE']:
                if col in filtered_df.columns:
                    unique_vals = filtered_df[col].dropna().unique()
                    logger.info(f'Unique {col} values: {unique_vals[:10]}{"..." if len(unique_vals) > 10 else ""}')
        else:
            # Log available values for debugging when no data matches
            logger.warning('No data matches the filters. Available values in original data:')
            for col in ['DISTRICT_CODE', 'SCHOOL_CODE', 'GRADE_CODE']:
                if col in df.columns:
                    unique_vals = df[col].dropna().unique()
                    logger.warning(f'Available {col} values: {unique_vals[:10]}{"..." if len(unique_vals) > 10 else ""}')
        
        return filtered_df
        
    except Exception as e:
        error_msg = f"Error in filter_data: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        # Return empty DataFrame with same columns as input on error
        return pd.DataFrame(columns=df.columns)

def calculate_risk_score(attendance_percentage: float, risk_factors: List[str]) -> float:
    """Calculate risk score based on attendance percentage and risk factors"""
    base_score = 100 - attendance_percentage
    risk_factor_points = len(risk_factors) * 5
    return min(100, base_score + risk_factor_points)

def get_risk_level(risk_score: float) -> str:
    """Convert risk score to risk level"""
    if risk_score >= 80:
        return 'Critical'  # Tier 4: <80% attendance - needs intensive intervention
    elif risk_score >= 60:
        return 'High'      # Tier 3: 80-90% attendance - early intervention required
    elif risk_score >= 40:
        return 'Medium'    # Tier 2: 90-95% attendance - needs individualized prevention
    else:
        return 'Low'       # Tier 1: ≥95% attendance - no intervention needed

def get_tier(attendance_percentage: float) -> str:
    """Get tier based on attendance percentage
    Tier 1: ≥95% predicted attendance – no intervention needed.
    Tier 2: 90% to <95% predicted attendance – needs individualized prevention.
    Tier 3: 80% to <90% predicted attendance – early intervention required.
    Tier 4: <80% predicted attendance – needs intensive intervention.
    """
    if attendance_percentage >= 95:
        return 'Tier 1'
    elif attendance_percentage >= 90:
        return 'Tier 2'
    elif attendance_percentage >= 80:
        return 'Tier 3'
    else:
        return 'Tier 4'

def assign_tiers(attendance_percentage: float) -> str:
    """Assign tier based on attendance percentage
    Tier 1: ≥95% attendance - no intervention needed
    Tier 2: 90-95% attendance - needs individualized prevention
    Tier 3: 80-90% attendance - early intervention required
    Tier 4: <80% attendance - needs intensive intervention
    """
    if attendance_percentage >= 95:
        return 'Tier 1'
    elif attendance_percentage >= 90:
        return 'Tier 2'
    elif attendance_percentage >= 80:
        return 'Tier 3'
    else:
        return 'Tier 4'
    return get_tier(attendance_percentage)

def get_analysis(search_criteria: AnalysisSearchCriteria):
    """Unified analysis API: full dataset if no filters, else apply filters."""
    logger.info(f"Received analysis request with criteria: {search_criteria.dict()}")
    
    if not hasattr(data_store, 'df') or data_store.df is None:
        error_msg = 'Data not loaded. Please check if the data file exists and is in the correct format.'
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
        
    if not data_store.is_ready:
        error_msg = 'Data is still being loaded. Please try again shortly.'
        logger.error(error_msg)
        raise HTTPException(status_code=503, detail=error_msg)
        
    try:
        start_time = time.time()
        logger.info("Starting data processing...")
        
        # Get a copy of the filtered data to avoid SettingWithCopyWarning
        try:
            df = data_store.df.copy()
            if df is None or df.empty:
                raise ValueError("DataFrame is empty or None")
                
            total_students = len(df)
            logger.info(f"Original dataset size: {total_students} rows")
            
            # Log available columns for debugging
            logger.info(f"Available columns in dataset: {df.columns.tolist()}")
            # Log sample data
            if not df.empty:
                logger.info(f"Sample data (first row): {df.iloc[0].to_dict()}")
                
                # Log available values for filter columns
                for col in ['DISTRICT_CODE', 'DISTRICT_NAME', 'SCHOOL_CODE', 'SCHOOL_NAME', 'GRADE_CODE', 'GRADE_LEVEL']:
                    if col in df.columns:
                        unique_vals = df[col].dropna().unique()
                        logger.info(f"Found {len(unique_vals)} unique values for {col}. First 5: {unique_vals[:5]}")
            
        except Exception as df_error:
            logger.error(f"Error accessing DataFrame: {str(df_error)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Error accessing data: {str(df_error)}"
            )
        
        # Apply filters if any filter criteria provided
        if any([search_criteria.district_code, search_criteria.grade_code, search_criteria.school_code]):
            logger.info("Applying filters to dataset...")
            try:
                df = filter_data(
                    df, 
                    district_code=search_criteria.district_code, 
                    school_code=search_criteria.school_code, 
                    grade_code=search_criteria.grade_code
                )
                # Ensure we have a copy of the filtered data
                df = df.copy()
                logger.info(f"Filtered dataset size: {len(df)} rows")
            except Exception as filter_error:
                logger.error(f"Error in filter_data: {str(filter_error)}")
                logger.error(traceback.format_exc())
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error applying filters: {str(filter_error)}"
                )
                
        if len(df) == 0:
            error_msg = f'No data found for filters: district={search_criteria.district_code}, grade={search_criteria.grade_code}, school={search_criteria.school_code}'
            logger.warning(error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        total_students = len(df)
        
        # Get attendance data
        if 'Predictions' in df.columns:
            attendance_series = df['Predictions'] * 100
        elif 'Predicted_Attendance' in df.columns:
            attendance_series = df['Predicted_Attendance']
        else:
            raise HTTPException(status_code=500, detail='No attendance data available in the dataset')
            
        # Assign tiers and risk levels using .loc for proper assignment
        tier_series = attendance_series.apply(assign_tiers)
        risk_level_series = attendance_series.apply(assign_risk_level)
        
        # Update the DataFrame with the new columns
        df = df.assign(TIER=tier_series, RISK_LEVEL=risk_level_series)
        below_85_mask = attendance_series < 85
        critical_risk_mask = risk_level_series == 'Critical'
        tier_counts = tier_series.value_counts()
        tier4 = int(tier_counts.get('Tier 4', 0))
        tier3 = int(tier_counts.get('Tier 3', 0))
        tier2 = int(tier_counts.get('Tier 2', 0))
        tier1 = int(tier_counts.get('Tier 1', 0))
        below_85_students = int(below_85_mask.sum())
        critical_risk_students = int(critical_risk_mask.sum())
        
        # Calculate prediction confidences if columns exist
        school_prediction = None
        grade_prediction = None
        
        if 'Predictions_School' in df.columns and not df['Predictions_School'].isna().all():
            school_prediction = round(df['Predictions_School'].mean() * 100, 1)
            
        if 'Predictions_Grade' in df.columns and not df['Predictions_Grade'].isna().all():
            grade_prediction = round(df['Predictions_Grade'].mean() * 100, 1)
        
        summary = SummaryStatistics(
            total_students=total_students, 
            below_85_students=below_85_students, 
            below_85_percentage=below_85_students / total_students * 100 if total_students else 0.0, 
            tier4_students=tier4, 
            tier4_percentage=tier4 / total_students * 100 if total_students else 0.0, 
            tier3_students=tier3, 
            tier3_percentage=tier3 / total_students * 100 if total_students else 0.0, 
            tier2_students=tier2, 
            tier2_percentage=tier2 / total_students * 100 if total_students else 0.0, 
            tier1_students=tier1, 
            tier1_percentage=tier1 / total_students * 100 if total_students else 0.0,
            school_prediction=school_prediction,
            grade_prediction=grade_prediction
        )
        insights = generate_ai_insights(df)
        recommendations = generate_ai_recommendations(df)
        logger.info(f'AI analysis completed in {time.time() - start_time:.4f} seconds')
        return AnalysisResponse(summary_statistics=summary, key_insights=insights, recommendations=recommendations)
    except Exception as e:
        logger.error(f'Error in get_analysis: {str(e)}')
        raise HTTPException(status_code=500, detail=str(e))

def assign_risk_level(attendance):
    """Assign risk level based on attendance percentage"""
    if attendance >= 95:
        return 'Low'
    elif attendance >= 90:
        return 'Medium'
    elif attendance >= 80:
        return 'High'
    else:
        return 'Critical'

def generate_ai_insights(df):
    """Generate AI-driven insights based on the data and ML model results"""
    insights = []
    total_students = len(df)
    
    # Ensure we have predicted attendance
    if 'Predicted_Attendance' not in df.columns:
        df['Predicted_Attendance'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
    
    # Calculate tier percentages
    tier4_pct = (df['TIER'] == 'Tier 4').sum() / total_students * 100 if total_students > 0 else 0
    tier3_pct = (df['TIER'] == 'Tier 3').sum() / total_students * 100 if total_students > 0 else 0
    tier2_pct = (df['TIER'] == 'Tier 2').sum() / total_students * 100 if total_students > 0 else 0
    tier1_pct = (df['TIER'] == 'Tier 1').sum() / total_students * 100 if total_students > 0 else 0
    
    # Tier-based insights
    tier_insights = [
        KeyInsight(insight=f"Tier 4 Students: {(df['TIER'] == 'Tier 4').sum()} students ({tier4_pct:.1f}%) have attendance below 80% - needs intensive intervention"),
        KeyInsight(insight=f"Tier 3 Students: {(df['TIER'] == 'Tier 3').sum()} students ({tier3_pct:.1f}%) have attendance between 80-90% - early intervention required"),
        KeyInsight(insight=f"Tier 2 Students: {(df['TIER'] == 'Tier 2').sum()} students ({tier2_pct:.1f}%) have attendance between 90-95% - needs individualized prevention"),
        KeyInsight(insight=f"Tier 1 Students: {(df['TIER'] == 'Tier 1').sum()} students ({tier1_pct:.1f}%) have attendance above 95% - no intervention needed")
    ]
    
    # 1. Prediction and Early Warning Insights
    if 'Predictions' in df.columns:
        predicted_decliners = df[df['Predictions'] == 1]
        if len(predicted_decliners) > 0:
            insights.append(KeyInsight(
                insight=f'AI MODEL PREDICTION: {len(predicted_decliners)} students ({len(predicted_decliners) / total_students * 100:.1f}%) are predicted to have problematic attendance in the future'
            ))
            
            early_warning = df[(df['Predicted_Attendance'] >= 85) & (df['Predictions'] == 1)]
            if len(early_warning) > 0:
                insights.append(KeyInsight(
                    insight=f'AI EARLY WARNING: {len(early_warning)} students ({len(early_warning) / total_students * 100:.1f}%) currently have good attendance but are predicted to decline'
                ))
    
    # 2. Unexcused Absence Analysis
    if 'Total_Days_Unexcused_Absent' in df.columns and 'Total_Days_Enrolled' in df.columns:
        df.loc[:, 'UNEXCUSED_ABSENT_RATE'] = df['Total_Days_Unexcused_Absent'] / df['Total_Days_Enrolled'] * 100
        high_unexcused = df[df['UNEXCUSED_ABSENT_RATE'] > 10]
        if len(high_unexcused) > 0:
            insights.append(KeyInsight(
                insight=f'HIGH UNEXCUSED ABSENCES: {len(high_unexcused)} students ({len(high_unexcused) / total_students * 100:.1f}%) have unexcused absence rates above 10%'
            ))
    
    # 3. Chronic Absence Analysis
    chronic_threshold = 80
    chronic_students = df[df['Predicted_Attendance'] < chronic_threshold]
    if len(chronic_students) > 0:
        chronic_pct = len(chronic_students) / total_students * 100
        insights.append(KeyInsight(
            insight=f'CHRONIC ABSENCE ALERT: {len(chronic_students)} students ({chronic_pct:.1f}%) are chronically absent with attendance below {chronic_threshold}%'
        ))
    
    # 4. Grade Level Analysis
    if 'STUDENT_GRADE_LEVEL' in df.columns:
        grade_analysis = df.groupby('STUDENT_GRADE_LEVEL')['Predicted_Attendance'].agg(['mean', 'count'])
        if not grade_analysis.empty:
            # Find grade with lowest attendance
            lowest_grade = grade_analysis['mean'].idxmin()
            lowest_attendance = grade_analysis['mean'].min()
            highest_grade = grade_analysis['mean'].idxmax()
            highest_attendance = grade_analysis['mean'].max()
            
            insights.extend([
                KeyInsight(insight=f'GRADE LEVEL: Grade {lowest_grade} has the lowest average attendance at {lowest_attendance:.1f}%'),
                KeyInsight(insight=f'BEST PERFORMING: Grade {highest_grade} has the highest average attendance at {highest_attendance:.1f}%')
            ])
            
            # Identify significant drops between consecutive grades
            grade_analysis = grade_analysis.sort_index()
            grade_analysis['change'] = grade_analysis['mean'].diff()
            significant_drop = grade_analysis[grade_analysis['change'] < -5]  # More than 5% drop
            
            for grade, row in significant_drop.iterrows():
                prev_grade = grade - 1 if isinstance(grade, (int, float)) else None
                if prev_grade in grade_analysis.index:
                    insights.append(KeyInsight(
                        insight=f'ATTENDANCE DROP: Grade {grade} shows a {abs(row["change"]):.1f}% drop in attendance compared to Grade {prev_grade}'
                    ))
    
    # 5. Attendance Trend Analysis (if historical data is available)
    if 'Previous_Attendance' in df.columns:
        df['Attendance_Change'] = df['Predicted_Attendance'] - df['Previous_Attendance']
        improving = df[df['Attendance_Change'] > 5]
        declining = df[df['Attendance_Change'] < -5]
        
        if len(improving) > 0:
            insights.append(KeyInsight(
                insight=f'POSITIVE TREND: {len(improving)} students ({len(improving)/total_students*100:.1f}%) have shown significant attendance improvement (>5%)'
            ))
        if len(declining) > 0:
            insights.append(KeyInsight(
                insight=f'DECLINING TREND: {len(declining)} students ({len(declining)/total_students*100:.1f}%) have shown significant attendance decline (>5%)'
            ))
    
    # 6. Pattern Recognition (if day-of-week data is available)
    day_columns = [col for col in df.columns if any(day in col.lower() for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])]
    if day_columns:
        day_means = df[day_columns].mean()
        worst_day = day_means.idxmin()
        best_day = day_means.idxmax()
        insights.append(KeyInsight(
            insight=f'DAY PATTERN: Lowest attendance typically on {worst_day.replace("_", " ").title()}, highest on {best_day.replace("_", " ").title()}'
        ))
    
    # 7. High-Impact Interventions (identify students who would benefit most from intervention)
    if 'RISK_SCORE' in df.columns and 'Total_Days_Enrolled' in df.columns:
        # Students with moderate risk but high potential for improvement
        high_impact = df[(df['RISK_SCORE'].between(40, 70)) & (df['Total_Days_Enrolled'] > 50)]
        if len(high_impact) > 0:
            insights.append(KeyInsight(
                insight=f'HIGH-IMPACT OPPORTUNITY: {len(high_impact)} students in the moderate risk range could benefit most from early intervention'
            ))
    
    return tier_insights + insights

def generate_ai_recommendations(df):
    """Generate AI-driven recommendations based on the data and ML model results"""
    recommendations = []
    
    # Ensure we have the necessary columns
    if 'Predicted_Attendance' not in df.columns:
        df['Predicted_Attendance'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
    
    # 1. Risk-Based Recommendations with Estimated Impact
    if 'RISK_LEVEL' in df.columns:
        risk_counts = df['RISK_LEVEL'].value_counts()
        critical = int(risk_counts.get('Critical', 0))
        high = int(risk_counts.get('High', 0))
        medium = int(risk_counts.get('Medium', 0))
        low = int(risk_counts.get('Low', 0))
        
        recommendations.extend([
            Recommendation(
                recommendation=f"PRIORITY INTERVENTION: Target {critical} Critical-risk students with intensive case management (estimated 60-80% improvement potential)"
            ),
            Recommendation(
                recommendation=f"EARLY SUPPORT: Implement small-group interventions for {high} High-risk students with regular progress monitoring (45-65% success rate)"
            ),
            Recommendation(
                recommendation=f"PREVENTATIVE ACTION: Deploy targeted communications to {medium} Medium-risk students (30-50% prevention rate)"
            ),
            Recommendation(
                recommendation=f"MAINTENANCE: Continue positive reinforcement for {low} Low-risk students to maintain good attendance patterns"
            )
        ])
    
    # 2. Time-Sensitive Recommendations
    if 'LAST_ABSENCE_DATE' in df.columns:
        df['DAYS_SINCE_LAST_ABSENCE'] = (pd.to_datetime('today') - pd.to_datetime(df['LAST_ABSENCE_DATE'])).dt.days
        recent_absentees = df[df['DAYS_SINCE_LAST_ABSENCE'] < 14]  # Absent in last 2 weeks
        if len(recent_absentees) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"TIMELY OUTREACH: Contact {len(recent_absentees)} students absent in the last 2 weeks (critical window for re-engagement)"
                )
            )
    
    # 3. Predictive Recommendations
    if 'Predictions' in df.columns and 'Prediction_Probability' in df.columns:
        # High confidence predictions
        high_confidence = df[(df['Predictions'] == 1) & (df['Prediction_Probability'] > 0.7)]
        if len(high_confidence) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"PREDICTIVE ALERT: Proactively engage with {len(high_confidence)} high-probability cases before attendance declines"
                )
            )
        
        # Early warning cases
        early_warning = df[(df['Predicted_Attendance'] >= 85) & (df['Predictions'] == 1)]
        if len(early_warning) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"EARLY INTERVENTION: Implement preventive measures for {len(early_warning)} students with good attendance but high risk of decline"
                )
            )
    
    # 4. Resource Allocation
    if 'SCHOOL_NAME' in df.columns and 'DISTRICT_NAME' in df.columns:
        school_risk = df.groupby(['DISTRICT_NAME', 'SCHOOL_NAME'])['RISK_LEVEL'].apply(
            lambda x: (x == 'Critical').mean() * 100
        ).sort_values(ascending=False).head(3)
        
        for (district, school), risk_pct in school_risk.items():
            if risk_pct > 0:
                recommendations.append(
                    Recommendation(
                        recommendation=f"RESOURCE ALLOCATION: Allocate additional support staff to {school} in {district} with {risk_pct:.1f}% critical-risk students"
                    )
                )
    
    # 5. Targeted Interventions
    if 'UNEXCUSED_ABSENT_RATE' in df.columns:
        high_unexcused = df[df['UNEXCUSED_ABSENT_RATE'] > 15]
        if len(high_unexcused) > 0:
            recommendations.append(
                Recommendation(
                    recommendation=f"TARGETED SUPPORT: Deploy family engagement specialists to work with {len(high_unexcused)} students with high unexcused absence rates (>15%)"
                )
            )
    
    # 6. Grade-Specific Strategies
    if 'STUDENT_GRADE_LEVEL' in df.columns:
        grade_analysis = df.groupby('STUDENT_GRADE_LEVEL').agg({
            'Predicted_Attendance': 'mean',
            'RISK_LEVEL': lambda x: (x == 'Critical').mean() * 100
        }).round(1)
        
        for grade, row in grade_analysis.iterrows():
            if row['RISK_LEVEL'] > 0:  # Only include grades with critical risk students
                recommendations.append(
                    Recommendation(
                        recommendation=f"GRADE-LEVEL STRATEGY: Implement specialized attendance program for Grade {grade} with {row['RISK_LEVEL']:.1f}% critical risk students"
                    )
                )
    
    # 7. Success Metrics and Monitoring
    recommendations.append(
        Recommendation(
            recommendation="PERFORMANCE METRICS: Establish baseline attendance rates and set 10% improvement targets for each risk tier"
        )
    )
    
    return recommendations

def get_primary_risk_factor(student_row):
    """Determine the primary risk factor for a specific student based on their data"""
    if not data_store.ml_models or 'feature_importance' not in data_store.ml_models:
        return 'Unknown'
    top_feature = max(data_store.ml_models['feature_importance'].items(), key=lambda x: x[1])[0]
    factor_mapping = {'Predicted_Attendance': 'Current Attendance Level', 'Total_Days_Unexcused_Absent': 'Unexcused Absent Days', 'Total_Days_Present': 'Days Present', 'Total_Days_Enrolled': 'Days Enrolled', 'STUDENT_GRADE_LEVEL': 'Grade Level'}
    return factor_mapping.get(top_feature, 'Multiple factors')

def generate_cache_key(*args, **kwargs):
    """Generate a unique cache key from function arguments"""
    key_parts = [str(arg) for arg in args] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
    key_string = "_".join(key_parts).encode('utf-8')
    return hashlib.md5(key_string).hexdigest()

def cache_response(ttl=3600):
    """Decorator to cache function responses with TTL"""
    def decorator(func):
        cache = {}
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Skip caching for non-GET requests
            request = kwargs.get('request')
            if request and request.method != 'GET':
                return await func(*args, **kwargs)
                
            # Generate cache key
            key = generate_cache_key(func.__name__, *args, **{k: v for k, v in kwargs.items() if k != 'request'})
            
            # Check cache
            current_time = time.time()
            if key in cache and (current_time - cache[key]['timestamp']) < ttl:
                return cache[key]['data']
                
            # Cache miss or expired
            result = await func(*args, **kwargs)
            cache[key] = {
                'data': result,
                'timestamp': current_time
            }
            return result
            
        return wrapper
    return decorator

def get_filter_options_endpoint():
    """Get hierarchical filter options for districts, schools, and grades with caching
    
    Returns:
        FilterOptions: Object containing lists of districts, schools, and grades
    """
    return get_filter_options()

def get_filter_options():
    """Get hierarchical filter options for districts, schools, and grades
    
    Returns:
        FilterOptions: Object containing lists of districts, schools, and grades
        Each item has:
        - value: Unique code (for API calls)
        - label: Display name (for UI)
    """
    if not data_store.is_ready:
        raise HTTPException(status_code=503, detail='Data is still being loaded. Please try again shortly.')
    try:
        df = data_store.df
        district_map = {}
        
        # Process districts - use original DISTRICT_CODE values
        for (district_code, district_name), district_df in df.groupby(['DISTRICT_CODE', 'DISTRICT_NAME']):
            district_code = str(district_code).strip()
            district_name = str(district_name).strip()
            schools_in_district = []
            
            # Debug: Log district being processed
            logger.debug(f"Processing district: {district_name} (Code: {district_code})")
            
            # Process schools in this district
            for (school_name, location_id), school_df in district_df.groupby(['SCHOOL_NAME', 'LOCATION_ID']):
                school_name = str(school_name).strip()
                school_code = str(location_id).strip()  # Use LOCATION_ID as the school code
                
                # Debug: Log school being processed
                logger.debug(f"  Processing school: {school_name} (ID: {school_code})")
                
                # Process grades in this school
                grades_in_school = []
                for grade in school_df['STUDENT_GRADE_LEVEL'].dropna().unique():
                    grade_str = str(grade).strip()
                    if not grade_str or grade_str.lower() == 'nan':
                        continue
                        
                    grade_entry = {
                        'value': grade_str,  # Use raw grade value without G prefix
                        'label': f"Grade {grade_str}",  # User-friendly label
                        'school': school_code,  # School's LOCATION_ID
                        'district': district_code  # Original district code
                    }
                    grades_in_school.append(grade_entry)
                    
                    # Debug: Log grade being added
                    logger.debug(f"    Added grade: {grade_entry}")
                    
                if not grades_in_school:
                    logger.warning(f"No grades found for school: {school_name} (ID: {school_code})")
                    continue
                
                # Add school to district
                school_entry = {
                    'value': school_code,
                    'label': school_name,
                    'district': district_code,  # Original district code
                    'district_name': district_name,  # Add district name
                    'location_id': str(location_id).strip(),  # Add location ID
                    'grades': grades_in_school
                }
                schools_in_district.append(school_entry)
                
                # Debug: Log school being added
                logger.debug(f"  Added school: {school_name} (ID: {school_code}) with {len(grades_in_school)} grades")
            
            # Add district to map with original code
            district_map[district_code] = {
                'value': district_code,  # Original district code
                'label': district_name,
                'schools': schools_in_district
            }
            
            # Debug: Log district being added
            logger.debug(f"Added district: {district_name} (Code: {district_code}) with {len(schools_in_district)} schools")
        
        # Create flat lists for all options
        districts = [district_map[d] for d in sorted(district_map.keys())]
        
        flat_districts = [{
            'value': d['value'],
            'label': d['label']
        } for d in districts]
        
        flat_schools = []
        for district in districts:
            for school in district['schools']:
                flat_schools.append({
                    'value': school['value'],
                    'label': school['label'],
                    'district': school['district']
                })
        
        # Get all grades with their full context
        flat_grades = []
        grade_count = 0
        
        logger.debug("Processing grades for all schools...")
        for district in districts:
            logger.debug(f"  District: {district['label']} ({district['value']})")
            for school in district['schools']:
                school_grade_count = 0
                
                # Log the raw grades data for this school
                logger.debug(f"    School: {school['label']} ({school['value']})")
                logger.debug(f"    Raw grades data: {school.get('grades', [])}")
                
                for grade in school.get('grades', []):
                    # Ensure grade value is in the correct format
                    grade_value = str(grade.get('value', '')).strip().upper()
                    if not grade_value.startswith('G'):
                        grade_value = f"G{grade_value}"
                    
                    grade_entry = {
                        'value': grade_value,
                        'label': f"Grade {grade_value.replace('G', '')}",
                        'school': school['value'],
                        'district': district['value']
                    }
                    flat_grades.append(grade_entry)
                    school_grade_count += 1
                    grade_count += 1
                
                logger.debug(f"    Processed {school_grade_count} grades for school {school['label']}")
        
        logger.debug(f"Total grades processed: {grade_count}")
        if flat_grades:
            logger.debug(f"Sample grade entries: {flat_grades[:3]}...")
        else:
            logger.warning("No grades were processed for any school")
        
        result = FilterOptions(
            districts=flat_districts,
            schools=sorted(flat_schools, key=lambda x: x['label']),
            grades=flat_grades
        )
        
        # Log the structure being returned
        logger.debug(f"Returning filter options with {len(flat_districts)} districts, {len(flat_schools)} schools, and {len(flat_grades)} grades")
        logger.debug(f"Sample grades in response: {flat_grades[:3]}")
        return result
    except Exception as e:
        logger.error(f'Error retrieving filter options: {str(e)}')
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f'Error retrieving filter options: {str(e)}')

def download_report(criteria: DownloadReportCriteria, report_type: str):
    """Download various types of reports with filtering using predictions"""
    try:
        logger.info(f"Starting report generation for type: {report_type}")
        logger.info(f"Filters - District: {criteria.district_code}, School: {criteria.school_code}, Grade: {criteria.grade_code}")
        
        if not data_store.is_ready:
            raise HTTPException(status_code=503, detail='Data not loaded yet')
            
        # Get a copy of the original dataframe
        df = data_store.df.copy()
        
        # Log initial data stats
        logger.info(f"Initial data shape: {df.shape}")
        
        # Apply filters if any
        if any([criteria.district_code, criteria.grade_code, criteria.school_code]):
            logger.info("Applying filters to data...")
            df = filter_data(df, 
                          district_code=criteria.district_code, 
                          grade_code=criteria.grade_code, 
                          school_code=criteria.school_code)
            logger.info(f"Data shape after filtering: {df.shape}")
        
        if len(df) == 0:
            error_msg = f"No data found for the selected filters. District: {criteria.district_code}, School: {criteria.school_code}, Grade: {criteria.grade_code}"
            logger.warning(error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        
        # Handle attendance data
        if 'Predictions' in df.columns:
            df['Predicted_Attendance'] = df['Predictions'] * 100
        elif 'Predicted_Attendance' not in df.columns:
            logger.error("No attendance data available in the dataset")
            raise HTTPException(status_code=500, 
                             detail='No attendance data available in the dataset. Please ensure the data contains either Predictions or Predicted_Attendance column.')
        
        # Assign tiers
        df['TIER'] = df['Predicted_Attendance'].apply(assign_tiers)
        
        # Generate the appropriate report based on type
        report_type = report_type.lower()
        logger.info(f"Generating {report_type} report...")
        
        if report_type == 'below_85':
            report_df = df[df['Predicted_Attendance'] < 85].copy()
            logger.info(f"Found {len(report_df)} students with attendance below 85%")
            
            if len(report_df) == 0:
                raise HTTPException(
                    status_code=404, 
                    detail='No students found with attendance below 85% for the selected filters.'
                )
                
            report_df = report_df.sort_values('Predicted_Attendance')
            report_df = generate_detailed_report(report_df)
            filename = f"attendance_below_85_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        elif report_type == 'tier1':
            report_df = df[df['TIER'] == 'Tier 1'].copy()
            logger.info(f"Found {len(report_df)} students in Tier 1 (≥95% attendance)")
            
            if len(report_df) == 0:
                raise HTTPException(
                    status_code=404,
                    detail='No students found in Tier 1 (≥95% attendance) for the selected filters.'
                )
                
            report_df = report_df.sort_values('Predicted_Attendance', ascending=False)
            report_df = generate_detailed_report(report_df)
            filename = f"tier1_attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        elif report_type == 'tier4':
            report_df = df[df['TIER'] == 'Tier 4'].copy()
            logger.info(f"Found {len(report_df)} students in Tier 4 (<80% attendance)")
            
            if len(report_df) == 0:
                raise HTTPException(
                    status_code=404,
                    detail='No students found in Tier 4 (<80% attendance) for the selected filters.'
                )
                
            report_df = report_df.sort_values('Predicted_Attendance')
            report_df = generate_detailed_report(report_df)
            filename = f"tier4_attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        elif report_type == 'summary':
            report_df = generate_summary_report(df)
            filename = f"attendance_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        elif report_type == 'detailed':
            report_df = generate_detailed_report(df)
            filename = f"attendance_detailed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            
        else:
            error_msg = f'Invalid report type: {report_type}. Valid types are: below_85, tier1, tier4, summary, detailed'
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Generate Excel file in memory
        output = io.BytesIO()
        report_df.to_excel(output, index=False)
        output.seek(0)
        
        # Set up response headers
        content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        headers = {
            'Content-Disposition': f'attachment; filename={filename}',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        
        logger.info(f"Successfully generated {report_type} report with {len(report_df)} rows")
        return StreamingResponse(output, media_type=content_type, headers=headers)
        
    except HTTPException:
        # Re-raise HTTP exceptions as they are
        raise
        
    except Exception as e:
        error_msg = f'Error generating report: {str(e)}'
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f'An error occurred while generating the report. Please try again later.'
        )

def generate_summary_report(df):
    """Generate a summary report with aggregated data"""
    group_cols = ['DISTRICT_NAME', 'STUDENT_GRADE_LEVEL']
    if 'SCHOOL_NAME' in df.columns:
        group_cols.insert(1, 'SCHOOL_NAME')
    if 'Predicted_Attendance' not in df.columns:
        df['Predicted_Attendance'] = df['Total_Days_Present'] / df['Total_Days_Enrolled'] * 100
    if 'RISK_SCORE' not in df.columns:
        df['RISK_SCORE'] = 100 - df['Predicted_Attendance']
    summary = df.groupby(group_cols).agg({'STUDENT_ID': 'count', 'Predicted_Attendance': ['mean', 'min', 'max', 'std'], 'RISK_SCORE': ['mean', 'min', 'max']}).reset_index()
    summary.columns = [' '.join(col).strip() for col in summary.columns.values]
    tiers = ['Tier 4', 'Tier 3', 'Tier 2', 'Tier 1']
    for tier in tiers:
        tier_counts = df.groupby(group_cols)['TIER'].apply(lambda x: (x == tier).sum()).reset_index(name=f'{tier} Count')
        summary = pd.merge(summary, tier_counts, on=group_cols)
    for tier in tiers:
        summary[f'{tier} %'] = (summary[f'{tier} Count'] / summary['STUDENT_ID count'] * 100).round(2)
    summary.rename(columns={'STUDENT_ID count': 'Total Students', 'Predicted_Attendance mean': 'Avg Attendance %', 'Predicted_Attendance min': 'Min Attendance %', 'Predicted_Attendance max': 'Max Attendance %', 'Predicted_Attendance std': 'Std Dev Attendance', 'RISK_SCORE mean': 'Avg Risk Score', 'RISK_SCORE min': 'Min Risk Score', 'RISK_SCORE max': 'Max Risk Score'}, inplace=True)
    return summary

def generate_detailed_report(df):
    """Generate a detailed student-level report with risk factors and recommendations"""
    report_df = df.copy()
    if 'Predicted_Attendance' not in df.columns:
        report_df['Predicted_Attendance'] = report_df['Total_Days_Present'] / report_df['Total_Days_Enrolled'] * 100
    if 'RISK_SCORE' not in report_df.columns:
        report_df['RISK_SCORE'] = 100 - report_df['Predicted_Attendance']
    if 'RISK_LEVEL' not in report_df.columns:
        report_df['RISK_LEVEL'] = report_df['Predicted_Attendance'].apply(assign_risk_level)
    risk_factors = []
    recommendations = []
    insights = []
    for _, row in report_df.iterrows():
        student_risk_factors = []
        student_recommendations = []
        attendance = row['Predicted_Attendance']
        
        # Add risk factors and recommendations based on tier classification
        if attendance < 80:  # Tier 4: <80% attendance - needs intensive intervention
            student_risk_factors.append('Chronic absenteeism (Tier 4)')
            student_recommendations.append('Intensive intervention required')
            student_recommendations.append('Family engagement specialist referral')
            student_recommendations.append('Personalized attendance plan')
        elif attendance < 90:  # Tier 3: 80-90% attendance - early intervention required
            student_risk_factors.append('At risk of chronic absenteeism (Tier 3)')
            student_recommendations.append('Early intervention required')
            student_recommendations.append('Attendance improvement plan')
        elif attendance < 95:  # Tier 2: 90-95% attendance - needs individualized prevention
            student_risk_factors.append('Moderate attendance concerns (Tier 2)')
            student_recommendations.append('Individualized prevention strategies')
            student_recommendations.append('Regular attendance monitoring')
        else:  # Tier 1: ≥95% attendance - no intervention needed
            student_risk_factors.append('Good attendance (Tier 1)')
            student_recommendations.append('Continue current practices')
        
        risk_factors.append('|'.join(student_risk_factors) if student_risk_factors else 'None')
        recommendations.append('|'.join(student_recommendations) if student_recommendations else 'Continue monitoring')
    report_df['Risk Factors'] = risk_factors
    report_df['Recommendations'] = recommendations
    columns_to_include = ['STUDENT_ID', 'DISTRICT_NAME', 'STUDENT_GRADE_LEVEL', 'Predicted_Attendance', 'TIER', 'RISK_SCORE', 'RISK_LEVEL', 'Risk Factors', 'Recommendations']
    if 'SCHOOL_NAME' in report_df.columns:
        columns_to_include.insert(2, 'SCHOOL_NAME')
    existing_columns = [col for col in columns_to_include if col in report_df.columns]
    report_df = report_df[existing_columns]
    column_renames = {'STUDENT_ID': 'Student ID', 'DISTRICT_NAME': 'District', 'SCHOOL_NAME': 'School', 'STUDENT_GRADE_LEVEL': 'Grade', 'Predicted_Attendance': 'Predicted Attendance %', 'RISK_SCORE': 'Risk Score', 'RISK_LEVEL': 'Risk Level'}
    rename_dict = {k: v for k, v in column_renames.items() if k in report_df.columns}
    report_df.rename(columns=rename_dict, inplace=True)
    return report_df

def get_districts():
    """Get list of unique districts with code-based values
    
    Maintains backward compatibility with the old endpoint while using the new code structure
    """
    try:
        # Get the full filter options
        filter_options = get_filter_options()
        # Return just the districts with code-based values
        return [
            {'value': d['value'], 'label': d['label'].strip()}
            for d in filter_options.districts
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error getting districts: {str(e)}')
        raise HTTPException(status_code=500, detail='Failed to retrieve districts')


def get_schools(district: Optional[str] = None) -> List[SchoolOption]:
    """Get list of schools with code-based values, optionally filtered by district
    
    Args:
        district: Optional district code or name to filter schools by
        
    Returns:
        List of SchoolResponse objects with school details
    """
    # Check if data is ready
    if not data_store.is_ready:
        raise HTTPException(status_code=503, detail='Data is still being loaded. Please try again shortly.')
    
    # Get the main dataframe
    df = data_store.df
    
    # If no district filter, return all schools with their district info
    if not district:
        # Group by district and school info to get unique combinations
        school_groups = df.groupby(['DISTRICT_CODE', 'DISTRICT_NAME', 'LOCATION_ID', 'SCHOOL_NAME']).size().reset_index()
        
        # Format the response with school code as value and school name as label
        return [
            SchoolOption(
                value=str(row['LOCATION_ID']).strip(),
                label=str(row['SCHOOL_NAME']).strip(),
                district=str(row['DISTRICT_CODE']).strip()
            )
            for _, row in school_groups.iterrows()
        ]
    
    # If district filter is provided, process it
    district = str(district).strip()
    
    # First try to match by district code (exact match)
    district_filter = (df['DISTRICT_CODE'].astype(str).str.strip() == district)

    
    # If still no match, return empty list
    if not district_filter.any():
        return []
    
    # Get the first matching district's info
    matched_district = df[district_filter].iloc[0]
    actual_district_code = str(matched_district['DISTRICT_CODE']).strip()
    
    # Filter schools by the matched district code
    filtered_df = df[df['DISTRICT_CODE'].astype(str).str.strip() == actual_district_code]
    school_groups = filtered_df.groupby(['LOCATION_ID', 'SCHOOL_NAME']).size().reset_index()
    
    # Format the response with school code as value and school name as label
    return [
        SchoolOption(
            value=str(row['LOCATION_ID']).strip(),
            label=str(row['SCHOOL_NAME']).strip(),
            district=actual_district_code
        )
        for _, row in school_groups.iterrows()
    ]



def get_grades(district: str | None = None, school: str | None = None) -> List[GradeResponse]:
    """Get list of grades, optionally filtered by district and school
    
    Args:
        district: Optional district code to filter by
        school: Optional school ID in format "district_code-location_id" to filter by
        
    Returns:
        List of GradeResponse objects with grade details
    """
    print(f"Getting grades for district: {district}, school: {school}")
    if not data_store.is_ready:
        raise HTTPException(status_code=503, detail='Data is still being loaded. Please try again shortly.')
        
    try:
        if data_store.df is None:
            raise ValueError("No data available")
            
        df = data_store.df.copy()
        
        # Apply district filter if provided
        if district:
            district = str(district).strip()
            df = df[df['DISTRICT_CODE'].astype(str).str.strip() == district]
            
        # Apply school filter if provided
        if school:
            school = str(school).strip()
            # Handle both formats: just location_id or district_code-location_id
            location_id = school.split('-', 1)[1].strip() if '-' in school else school
            logger.debug(f"Filtering grades by school. Input: {school}, Extracted location_id: {location_id}")
            df = df[df['LOCATION_ID'].astype(str).str.strip() == location_id]
            logger.debug(f"Found {len(df)} students matching location_id {location_id}")
        
        if len(df) == 0:
            return []
            
        # Get unique grades from the appropriate column
        grade_col = 'STUDENT_GRADE_LEVEL' if 'STUDENT_GRADE_LEVEL' in df.columns else 'GRADE_LEVEL'
        if grade_col not in df.columns:
            raise ValueError(f"Grade column '{grade_col}' not found in data")
        
        # Debug: Log the available grade values before filtering
        logger.debug(f"Available grade values before filtering: {df[grade_col].unique()}")
        
        # Normalize grade values
        def normalize_grade_value(grade):
            if pd.isna(grade):
                return None
            grade_str = str(grade).strip()
            # Handle special cases
            if grade_str.upper() in ['PK', 'P', 'PRE-K', 'PREK', 'PRE-KINDERGARTEN']:
                return '-1'  # PK
            if grade_str.upper() in ['K', 'KG', 'KINDERGARTEN']:
                return '0'   # K
                
            # Extract numeric part if it exists
            try:
                # Try to extract numbers from strings like 'Grade 1' or 'G1'
                import re
                match = re.search(r'\d+', grade_str)
                if match:
                    return match.group(0)
                # If no numbers found, try to convert directly
                float_val = float(grade_str)
                return str(int(float_val)) if float_val.is_integer() else grade_str
            except (ValueError, TypeError):
                return grade_str
        
        # Get unique normalized grades
        unique_grades = df[grade_col].dropna().apply(normalize_grade_value).dropna().unique()
        logger.debug(f"Normalized grade values: {unique_grades}")
        
        # Sort grades (PK, K, 1-12, then others)
        def grade_sort_key(grade_str):
            if not grade_str or pd.isna(grade_str):
                return (float('inf'), '')
                
            grade_str = str(grade_str).strip()
            
            # Handle special cases first
            if grade_str == '-1' or grade_str.upper() in ['PK', 'P', 'PRE-K', 'PREK']:
                return (-1, 'PK')
            if grade_str == '0' or grade_str.upper() in ['K', 'KG']:
                return (0, 'K')
                
            # Try to convert to number for numeric sorting
            try:
                num = int(grade_str)
                return (num, str(num))
            except (ValueError, TypeError):
                # For non-numeric grades, sort alphabetically after numbers
                return (float('inf'), grade_str)
        
        # Create and return sorted result
        return [
            GradeResponse(
                value=grade,
                label='PK' if grade == '-1' else ('K' if grade == '0' else grade),
                district=district if district else None,
                school=school if school else None
            )
            for grade in sorted(unique_grades, key=grade_sort_key)
        ]
        
    except Exception as e:
        logger.error(f'Error getting grades: {str(e)}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'Failed to retrieve grades: {str(e)}')

if __name__ == '__main__':
    import uvicorn
    import logging
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger('uvicorn')
    logger.setLevel(logging.DEBUG)
    uvicorn.run('main:app', host='127.0.0.1', port=8001, reload=True, log_level='debug')
