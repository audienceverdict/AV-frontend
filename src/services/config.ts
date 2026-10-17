const defaultApiBaseUrl = 'https://api.audienceverdict.in/api/v1';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, '');
