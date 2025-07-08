// axios.ts
import axios from "axios";

const AUTH_TOKEN_KEY = "auth_token";

/**
 * Create a pre-configured Axios instance for your API.
 * Adjust `baseURL` as needed.
 */
const axiosInstance = axios.create({
  baseURL: "https://best.bvm.ngrok.app/aip_api/api/FastAPIService/",
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Persist (or remove) the Bearer token in localStorage.
 * Call this once when you first receive the token and whenever you log out.
 */
export const setAuthToken = (token: string | null): void => {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else       localStorage.removeItem(AUTH_TOKEN_KEY);
};

/* -------------------------------------------------------------------------- */
/*                              Request Interceptor                           */
/* -------------------------------------------------------------------------- */

axiosInstance.interceptors.request.use(
  (config) => {
    // Always read the current token just before the request is sent
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    else       delete config.headers.Authorization; // defensive
    return config;
  },
  (error) => Promise.reject(error)
);

/* -------------------------------------------------------------------------- */
/*                              Response Interceptor                          */
/* -------------------------------------------------------------------------- */

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Auto-logout on 401 – token expired or invalid
    if (error.response?.status === 401) {
      setAuthToken(null);
      console.error("⚠️  Received 401 – cleared auth token.");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
