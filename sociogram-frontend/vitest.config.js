import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    env: { VITE_API_URL: 'http://127.0.0.1:4301' },
    restoreMocks: true,
  },
});
