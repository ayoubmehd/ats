import { defineConfig } from "vitest/config";
import path from "path";
export default defineConfig({
  test: {
    root: path.resolve(__dirname, "."),
    environment: "node",
    globalSetup: "./globalSetup.ts",
    setupFiles: ["./src/tests/vitest.setup.ts"],
    exclude: ["node_modules", "dist"],
  },
});
