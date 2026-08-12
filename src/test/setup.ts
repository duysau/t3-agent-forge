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
process.env.NEXT_PUBLIC_VOICE_GATEWAY_URL ??= "http://127.0.0.1:8787";
process.env.NEXT_PUBLIC_VOICE_PROFILE ??= "longchau";
process.env.SKIP_ENV_VALIDATION ??= "1";

// jsdom thiếu Pointer Capture API và scrollIntoView; Radix Select cần cả hai.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

// jsdom cũng thiếu `matchMedia`; `next-themes` gọi nó để đọc `prefers-color-scheme`.
// Trả `matches: false` = "không ưu tiên chế độ tối", nên test nào không tự đặt
// theme sẽ chạy ở giao diện sáng — mặc định tất định, không phụ thuộc máy chạy test.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    media: query,
    matches: false,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}
