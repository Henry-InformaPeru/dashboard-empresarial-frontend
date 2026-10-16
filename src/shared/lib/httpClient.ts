import axios from 'axios';

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