import os
import joblib

class FileUtils:
    def __init__(self) -> None:
        self.MODEL_CACHE_DIR = "model_cache"
        os.makedirs(self.MODEL_CACHE_DIR, exist_ok=True)


    def get_model_filename(self, model_name: str) -> str:
        return os.path.join(self.MODEL_CACHE_DIR, f"{model_name}.joblib")


    def save_model(self, model, model_name: str):
        filename = self.get_model_filename(model_name)
        joblib.dump(model, filename)


    def load_model(self, model_name: str):
        filename = self.get_model_filename(model_name)
        model = joblib.load(filename)

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
    
