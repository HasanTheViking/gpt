import axios from "axios";

const PROD_API = "https://smart-shopping-backend-tet6.onrender.com";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? PROD_API
});

// VŽDY priloží token, ak existuje
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(_token?: string) {
  // môže zostať prázdne alebo to môžeš úplne odstrániť z App.tsx
}

export default api;
