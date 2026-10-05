import axios, { AxiosError, InternalAxiosRequestConfig, create } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/config';
import type { AuthResponse } from '../types';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const tokenStorage = {
  async getAccess() {
    return AsyncStorage.getItem(ACCESS_KEY);
  },
  async getRefresh() {
    return AsyncStorage.getItem(REFRESH_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string) {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, accessToken],
      [REFRESH_KEY, refreshToken],
    ]);
  },
  async clear() {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  },
};

export const api = create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/register')) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshToken = await tokenStorage.getRefresh();
          if (!refreshToken) {
            return null;
          }
          const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          await tokenStorage.setTokens(data.accessToken, data.refreshToken);
          return data.accessToken;
        } catch {
          await tokenStorage.clear();
          onUnauthorized?.();
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newToken = await refreshPromise;
    if (!newToken) {
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${newToken}`;
    return api(original);
  }
);
