import axios from 'axios';

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) {
    if (import.meta.env.PROD) {
      console.error(
        '[PulsePM] VITE_API_URL is not set in production! Falling back to http://localhost:5000/api which will fail on deployed sites.'
      );
    }
    return 'https://pulsepm-saas.vercel.app/api';
  }
  const normalized = raw.replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

export const API_BASE = resolveApiBase();

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: dynamically attach JWT token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: extract response body and handle session expiration
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'An unexpected error occurred';

    // If unauthorized and not already on login/register page
    if (error.response?.status === 401 && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register') && !window.location.pathname.includes('/invites/accept')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(new Error(message));
  }
);
