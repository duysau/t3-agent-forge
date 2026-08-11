import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest.config.ts runs without `test.globals`, so @testing-library/react's
// own auto-cleanup (which only registers when `afterEach` is a global) never
// fires. Without this, DOM from one `it()` leaks into the next within the
// same file, and any two tests that render overlapping text collide.
afterEach(() => {
  cleanup();
});

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.PYTHON_API_URL ??= "http://127.0.0.1:8444";
process.env.NEXT_PUBLIC_PYTHON_WS_URL ??= "ws://127.0.0.1:8444";
process.env.SKIP_ENV_VALIDATION ??= "1";
