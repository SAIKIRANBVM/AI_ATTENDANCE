import axios from "axios";

const AUTH_TOKEN_KEY = "auth_token";
const axiosInstance = axios.create({
  baseURL: "https://best.bvm.ngrok.app/aip_api/api/FastAPIService/",
  // baseURL: "https://localhost:9000/api/predictions",
  headers: {
    "Content-Type": "application/json",
  },
});


export const setAuthToken = (token: string | null): void => {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
};


axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization; 
    return config;
  },
  (error) => Promise.reject(error)
);


axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      console.error("Received 401 - cleared auth token.");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
