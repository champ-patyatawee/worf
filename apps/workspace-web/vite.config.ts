import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['client', 'localhost', '127.0.0.1', 'frontend'],
    proxy: {
      // Kanban API endpoints (port 8000)
      '/api/boards': {
        target: process.env.VITE_KANBAN_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/api/tasks': {
        target: process.env.VITE_KANBAN_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // Note API endpoints (port 3000)
      '/api/settings': {
        target: process.env.VITE_NOTE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/api/folders': {
        target: process.env.VITE_NOTE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/api/pages': {
        target: process.env.VITE_NOTE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/api/ai': {
        target: process.env.VITE_NOTE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      // Main API (port 3001)
      '/api': {
        target: process.env.VITE_PROXY_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/socket.io': {
        target: process.env.VITE_PROXY_URL || 'http://localhost:3001',
        ws: true,
      },
      '/uploads': {
        target: process.env.VITE_PROXY_URL || 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});
