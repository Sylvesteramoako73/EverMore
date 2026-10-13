import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    // `server-only` throws outside the React server runtime; tests run in plain Node.
    alias: { "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "memory://",
      GEOCODER: "off",
      BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
      APP_URL: "https://evermore.test",
      UPLOAD_DIR: "./data/test-uploads",
    },
    // Each file boots its own in-memory Postgres (WASM); running files in parallel exhausts memory on small machines.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
