import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/features/time-off/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/features/time-off/**", "src/providers/**", "src/hooks/**"],
      exclude: ["src/**/*.test.*", "src/**/*.stories.*", "src/**/__tests__/**", "src/**/api-store.ts"],
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
