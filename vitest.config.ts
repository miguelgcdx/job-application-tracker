import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    exclude: [...configDefaults.exclude, "tests/e2e/**", ".next/**"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "json", "html"],
      include: ["{app,components,lib,models}/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.{test,spec,stories}.{ts,tsx}",
        "**/{__tests__,__mocks__,__fixtures__,tests,fixtures}/**",
        "**/generated/**",
      ],
    },
  },
});
