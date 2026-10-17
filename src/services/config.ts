const defaultApiBaseUrl = 'http://192.168.29.140:8080/api/v1';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, '');
