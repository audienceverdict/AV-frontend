import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiBaseUrl = (env.VITE_API_BASE_URL || 'https://api.audienceverdict.in/api/v1').replace(/\/$/, '');
  const apiUrl = new URL(apiBaseUrl);

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiUrl.origin,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/v1/, apiUrl.pathname.replace(/\/$/, '')),
        },
      },
    },
  };
});
