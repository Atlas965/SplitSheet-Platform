import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["server/__tests__/**/*.test.ts"],
    setupFiles: ["./server/__tests__/setup.ts"],
  },
});
