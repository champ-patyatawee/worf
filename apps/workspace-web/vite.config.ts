import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// In Docker Compose, services are reachable via Traefik on the internal network.
// When running locally on the host, proxy directly to each service.
const usingTraefik = !!process.env.TRAEFIK_URL;

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
    proxy: usingTraefik
      ? // ── Docker Compose mode: proxy through Traefik ──────────
        {
          // Traefik handles path stripping and auth. No rewrite needed.
          '/socket.io': {
            target: process.env.TRAEFIK_URL,
            changeOrigin: true,
            ws: true,
          },
          '/ws': {
            target: process.env.TRAEFIK_URL,
            changeOrigin: true,
            ws: true,
          },
          '/notes': {
            target: process.env.TRAEFIK_URL,
            changeOrigin: true,
          },
          '/kanban': {
            target: process.env.TRAEFIK_URL,
            changeOrigin: true,
          },
        }
      : // ── Local dev mode: proxy directly to services ──────────
        {
          // Strip /ws prefix, forward to workspace-api
          '/ws': {
            target: process.env.VITE_API_URL || 'http://localhost:3001',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/ws/, ''),
            ws: true,
          },
          // Strip /notes prefix, forward to note-api
          '/notes': {
            target: process.env.VITE_NOTE_API_URL || 'http://localhost:3000',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/notes/, ''),
          },
          // Strip /kanban prefix, forward to kanban-api
          '/kanban': {
            target: process.env.VITE_KANBAN_API_URL || 'http://localhost:8000',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/kanban/, ''),
          },
          // Legacy direct paths (backward compat for old .env values)
          '/api/boards': {
            target: process.env.VITE_KANBAN_API_URL || 'http://localhost:8000',
            changeOrigin: true,
          },
          '/api/tasks': {
            target: process.env.VITE_KANBAN_API_URL || 'http://localhost:8000',
            changeOrigin: true,
          },
          '/api/settings': {
            target: process.env.VITE_NOTE_API_URL || 'http://localhost:3000',
            changeOrigin: true,
          },
          '/api/folders': {
            target: process.env.VITE_NOTE_API_URL || 'http://localhost:3000',
            changeOrigin: true,
          },
          '/api/pages': {
            target: process.env.VITE_NOTE_API_URL || 'http://localhost:3000',
            changeOrigin: true,
          },
          '/api/ai': {
            target: process.env.VITE_NOTE_API_URL || 'http://localhost:3000',
            changeOrigin: true,
          },
          '/api': {
            target: process.env.VITE_PROXY_URL || 'http://localhost:3001',
            changeOrigin: true,
          },
          '/socket.io': {
            target: process.env.VITE_PROXY_URL || 'http://localhost:3001',
            ws: true,
          },
          '/uploads': {
            target: process.env.VITE_PROXY_URL || 'http://localhost:3001',
            changeOrigin: true,
          },
        },
  },
});