import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.spec.{ts,tsx}"],
    css: { modules: { classNameStrategy: "non-scoped" } },
    server: {
      deps: {
        inline: ["novel", "react-tweet"],
      },
    },
  },
});
