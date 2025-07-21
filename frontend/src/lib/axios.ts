import axios from "axios";

// For development, use HTTP instead of HTTPS to avoid SSL issues
const isDevelopment = process.env.NODE_ENV === 'development';
const baseURL = isDevelopment 
  ? 'http://localhost:8000/api/alerts' 
  : 'https://your-production-url.com/api/alerts';

const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  // Increase timeout to 30 seconds
  timeout: 30000,
});

// Add request interceptor for logging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout. Please check your internet connection.');
      error.message = 'Request timeout. Please check your internet connection.';
    } else if (!error.response) {
      console.error('Network Error: Could not connect to the server.');
      error.message = 'Network Error: Could not connect to the server. Please check your internet connection or if the server is running.';
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token?: string): void => {
  // No-op function to maintain compatibility
};

export default axiosInstance;
