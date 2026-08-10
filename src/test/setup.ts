import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.PYTHON_API_URL ??= "http://127.0.0.1:8444";
process.env.NEXT_PUBLIC_PYTHON_WS_URL ??= "ws://127.0.0.1:8444";
process.env.SKIP_ENV_VALIDATION ??= "1";
