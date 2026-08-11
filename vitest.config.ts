import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    // src/test/db.ts spins up a fresh PGlite instance and replays every migration
    // on each test's beforeEach; under Windows filesystem + parallel-file
    // contention that can exceed Vitest's 10s default hook timeout. Raised so
    // DB-backed setup isn't flaky under load as more DB test files are added.
    hookTimeout: 30_000,
  },
});
