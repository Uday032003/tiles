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

function getCacheKey(url) {
  return `dm_cache_${url}`;
}

export function saveToOfflineCache(url, data) {
  try {
    if (!url || !data) return;
    localStorage.setItem(getCacheKey(url), JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // quota exceeded or private mode, silently ignore
  }
}

export function getFromOfflineCache(url) {
  try {
    if (!url) return null;
    const raw = localStorage.getItem(getCacheKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.config?.method?.toLowerCase() === 'get' && response.data) {
      saveToOfflineCache(response.config.url, response.data);
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event('dm-tiles:unauthorized'));
    }

    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout') ||
      (typeof navigator !== 'undefined' && !navigator.onLine);

    // If GET request fails with network error, attempt to serve from offline cache
    if (isNetworkError && error.config?.method?.toLowerCase() === 'get') {
      const cachedData = getFromOfflineCache(error.config.url);
      if (cachedData) {
        return {
          data: cachedData,
          status: 200,
          statusText: 'OK (Offline Cache)',
          headers: {},
          config: error.config,
          isOfflineCached: true,
        };
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Unable to reach server. Please check your connection.';
    const normalized = new Error(message);
    normalized.status = error.response?.status;
    normalized.response = error.response;
    normalized.details = error.response?.data?.details || null;
    normalized.isNetworkError = isNetworkError;
    return Promise.reject(normalized);
  }
);

export async function mutateWithOfflineQueue({ method, url, data, label, mockResult = {} }) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const entry = await enqueueMutation({ method, url, data, label });
    return { queuedOffline: true, id: entry?.id || `offline-${Date.now()}`, ...data, ...mockResult };
  }

  try {
    const response = await apiClient.request({ method, url, data });
    return response.data?.data !== undefined ? response.data.data : response.data;
  } catch (err) {
    if (err.isNetworkError || !err.response) {
      const entry = await enqueueMutation({ method, url, data, label });
      return { queuedOffline: true, id: entry?.id || `offline-${Date.now()}`, ...data, ...mockResult };
    }
    throw err;
  }
}

export default apiClient;
