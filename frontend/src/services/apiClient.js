import axios from 'axios';
import { enqueueMutation } from '../utils/offlineQueue.js';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

function resolveBaseUrl(url) {
  if (!url) return '/api/v1';
  const clean = url.trim().replace(/\/$/, '');
  if (clean.startsWith('/')) return clean;
  if (!clean.endsWith('/api/v1') && !clean.endsWith('/api')) {
    return `${clean}/api/v1`;
  }
  return clean;
}

const API_BASE_URL = resolveBaseUrl(rawBaseUrl);

export const TOKEN_STORAGE_KEY = 'dm_tiles_token';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event('dm-tiles:unauthorized'));
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      'Unable to reach server. Please check your connection.';
    const normalized = new Error(message);
    normalized.status = error.response?.status;
    normalized.response = error.response;
    normalized.details = error.response?.data?.details || null;
    normalized.isNetworkError = !error.response;
    return Promise.reject(normalized);
  }
);

export async function mutateWithOfflineQueue({ method, url, data, label }) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueMutation({ method, url, data, label });
    return { queuedOffline: true, ...data };
  }

  try {
    const response = await apiClient.request({ method, url, data });
    return response.data.data;
  } catch (err) {
    if (err.isNetworkError) {
      await enqueueMutation({ method, url, data, label });
      return { queuedOffline: true, ...data };
    }
    throw err;
  }
}

export default apiClient;
