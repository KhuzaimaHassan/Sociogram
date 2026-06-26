import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_PROXY || 'http://localhost:3001';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1000, // face-api.js is intentionally large (ML model)
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Heavy ML library — loaded lazily when camera activates
            if (id.includes('face-api')) return 'face-api';
            // React ecosystem
            if (id.includes('react-dom') || id.includes('react-router')) return 'react-vendor';
            // Other node_modules
            if (id.includes('node_modules')) return 'vendor';
          },
        },
      },
    },
  };
});

