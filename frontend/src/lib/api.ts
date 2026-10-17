import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  // Session storage takes precedence, followed by persistent local storage
  return sessionStorage.getItem('jobgateway_token') || localStorage.getItem('jobgateway_token') || null;
};

export const setAuthToken = (token: string, rememberMe: boolean = false) => {
  if (typeof window === 'undefined') return;
  // Clear any existing tokens first
  sessionStorage.removeItem('jobgateway_token');
  localStorage.removeItem('jobgateway_token');

  if (rememberMe) {
    localStorage.setItem('jobgateway_token', token);
  } else {
    sessionStorage.setItem('jobgateway_token', token);
  }
};

export const clearAuthToken = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('jobgateway_token');
  localStorage.removeItem('jobgateway_token');
};

// Request interceptor: attaches active token
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: on 401 or 403, safely clears stale credentials and redirects to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (!['/login', '/register'].includes(path)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Returns accessible URL for uploaded media files (videos, resumes)
 * Works in both local development and deployed cloud environments (Render, Vercel).
 */
export function getMediaUrl(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  const prefix = filePath.startsWith('/') ? '' : '/';
  return `${base}${prefix}${filePath}`;
}
