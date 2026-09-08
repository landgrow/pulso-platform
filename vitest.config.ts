import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules", "dist", ".next", "aiox-core"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "*.config.*",
        ".next/",
        "aiox-core/",
        "db/",
        "supabase/",
        "fluent forms/",
        "api/",
        "views/",
        "store.js",
        "app.js",
      ],
    },
    setupFiles: ["./tests/setup.ts"],
  },
});
