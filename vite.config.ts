import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const NOCOBASE_URL = process.env.VITE_NOCODB_URL || 'https://vmi3107375.contaboserver.net';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: NOCOBASE_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
