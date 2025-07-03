import axios from "axios";

const AUTH_TOKEN_KEY = "auth_token";

// Get base URL from environment or use default
const API_BASE_URL = "http://localhost:8000/api/alerts";

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 300000, // 5 minute timeout for report downloads
});

// Token management
let authToken: string | null = localStorage.getItem(AUTH_TOKEN_KEY);

export const setAuthToken = (token: string | null) => {
  authToken = token;
  // Update localStorage
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

// Add request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // For development: Skip auth for public endpoints
    const isPublicEndpoint = [
      "/api/filter-options",
      "/api/filters/schools",
      "/api/filters/grades",
      "/api/prediction-insights",
    ].some((path) => config.url?.includes(path));

    // Add auth token if available and not a public endpoint
    if (authToken && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${authToken}`;
      console.debug("Request with auth token to:", config.url);
    } else if (!isPublicEndpoint) {
      console.warn("No auth token available for request to:", config.url);
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === "development") {
      console.debug("API Response:", {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log the full error in development
    if (process.env.NODE_ENV === "development") {
      console.error("API Error:", {
        url: originalRequest?.url,
        status: error.response?.status,
        data: error.response?.data,
        config: originalRequest,
      });
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn(
        "Authentication required or session expired for:",
        originalRequest.url
      );
      setAuthToken(null);

      // Only attempt redirect if not already on a login page and not a public endpoint
      const isPublicEndpoint = [
        "/api/filter-options",
        "/api/filters/schools",
        "/api/filters/grades",
        "/api/prediction-insights",
        "/api/auth/",
      ].some((path) => originalRequest.url?.includes(path));

      if (!window.location.pathname.includes("login") && !isPublicEndpoint) {
        console.log("Authentication required. Please log in.");
        // Store the intended URL to redirect back after login
        // sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        // window.location.href = '/login';
      }
    }

    // Handle other error statuses
    if (error.response?.status >= 500) {
      console.error("Server error:", error.response.status);
    } else if (error.response?.status >= 400) {
      console.warn("Client error:", error.response.status);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
