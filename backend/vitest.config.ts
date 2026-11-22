import { defineConfig } from "vitest/config";
import { testEnvironment } from "./tests/test-environment.js";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: testEnvironment,
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/reset-database.ts"],
    fileParallelism: false,
  },
});
