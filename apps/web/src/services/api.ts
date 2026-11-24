import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return null;
  if (!refreshing) {
    refreshing = axios
      .post(`${API_URL}/auth/refresh`, { refreshToken })
      .then((res) => {
        setTokens(res.data.accessToken, res.data.refreshToken);
        return res.data.accessToken as string;
      })
      .catch(() => {
        clear();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      const token = await refreshAccess();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown): string {
  const err = error as AxiosError<{ message?: string | string[]; errors?: Record<string, string[]> }>;
  const data = err?.response?.data;
  if (!data) return err?.message || 'Something went wrong';
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.message)) return data.message.join(', ');
  if (data.errors) return Object.values(data.errors).flat().join(', ');
  return 'Request failed';
}
