import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// In Docker Compose with Traefik, services are reachable via Traefik on the
// internal network. When running locally or in E2E mode (no TRAEFIK_URL),
// proxy directly to each service.
const usingTraefik = !!process.env.TRAEFIK_URL;

// Proxy targets for local/E2E mode (no Traefik)
const wsTarget = process.env.WORKSPACE_API_URL || process.env.VITE_API_URL || 'http://localhost:3001';
const noteTarget = process.env.NOTE_API_URL || process.env.VITE_NOTE_API_URL || 'http://localhost:3000';
const kanbanTarget = process.env.KANBAN_API_URL || process.env.VITE_KANBAN_API_URL || 'http://localhost:8000';

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
    allowedHosts: ['client', 'traefik', 'localhost', '127.0.0.1', 'frontend'],
    proxy: usingTraefik
      ? // ── Docker Compose mode: proxy through Traefik ──────────
        {
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
      : // ── Local dev / E2E mode: proxy directly to services ──
        {
          // Strip /ws prefix, forward to workspace-api
          '/ws': {
            target: wsTarget,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/ws/, ''),
            ws: true,
          },
          // Strip /notes prefix, forward to note-api
          '/notes': {
            target: noteTarget,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/notes/, ''),
          },
          // Strip /kanban prefix, forward to kanban-api
          '/kanban': {
            target: kanbanTarget,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/kanban/, ''),
          },
          // Direct /api/* routes (e2e tests use /api/auth/register)
          '/api/boards': {
            target: kanbanTarget,
            changeOrigin: true,
          },
          '/api/tasks': {
            target: kanbanTarget,
            changeOrigin: true,
          },
          '/api/settings': {
            target: noteTarget,
            changeOrigin: true,
          },
          '/api/folders': {
            target: noteTarget,
            changeOrigin: true,
          },
          '/api/pages': {
            target: noteTarget,
            changeOrigin: true,
          },
          '/api/ai': {
            target: noteTarget,
            changeOrigin: true,
          },
          '/api': {
            target: wsTarget,
            changeOrigin: true,
          },
          '/socket.io': {
            target: wsTarget,
            ws: true,
          },
          '/uploads': {
            target: wsTarget,
            changeOrigin: true,
          },
        },
  },
});