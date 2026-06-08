import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        // xterm.js parser uses function.toString() which breaks with certain compressions
        keep_fnames: true,
        keep_infinity: true,
      },
      mangle: {
        // Don't mangle reserved names that xterm.js depends on
        reserved: ["Terminal", "Parser", "InputHandler"],
      },
    },
    rollupOptions: {
      output: {
        // Keep function names for xterm.js
        manualChunks: undefined,
      },
    },
  },
}));
