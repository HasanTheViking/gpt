import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
});

// Always attach token (if present) for every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token?: string) {
  // Keep this helper if the rest of the app uses it
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;
  }
}

export default api;
