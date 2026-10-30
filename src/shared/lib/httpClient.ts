import axios from 'axios';
import { limpiarSesionYRedirigir } from './auth';

export const httpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar automáticamente el JWT en cada petición
httpClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor de respuesta: si la sesión expiró (401), limpia el almacenamiento y redirige al login
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si la petición es del formulario de login y falla con 401, dejamos que el formulario maneje el error
    const esLogin = error.config?.url?.includes('/auth/login');
    if (typeof window !== 'undefined' && error.response?.status === 401 && !esLogin) {
      limpiarSesionYRedirigir('/');
    }
    return Promise.reject(error);
  }
);
