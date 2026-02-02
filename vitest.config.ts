import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    setupFiles: [],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
