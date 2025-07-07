import axios from "axios";
const AUTH_TOKEN_KEY = "auth_token";

const axiosInstance = axios.create({
  // baseURL: "http://127.0.0.1:9000/api/FastAPIService",
  // baseURL: "http://localhost:9000/api/predictions",
  // baseURL: "http://localhost:9000/api/",
  baseURL: "https://best.bvm.ngrok.app/aip_api/api/FastAPIService/",
  headers: {
    "Content-Type": "application/json",
  },
});

let authToken: string | null = localStorage.getItem(AUTH_TOKEN_KEY);

export const setAuthToken = (token: string | null) => {
  console.log(`The token value in axios setToken function: ${token}`)
  authToken = token;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

axiosInstance.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      console.error("Unauthorized request");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
