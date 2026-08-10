import { describe, expect, it } from "vitest";
import { serverSchema } from "./env-schema";

describe("serverSchema", () => {
  it("nhận cấu hình hợp lệ và áp mặc định", () => {
    const parsed = serverSchema.parse({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/db",
      PYTHON_API_URL: "http://127.0.0.1:8444",
    });
    expect(parsed.FALLBACK_TO_FIXTURE).toBe(true);
    expect(parsed.CRAWL_MAX_PAGES).toBe(5);
  });

  it("từ chối PYTHON_API_URL không phải URL", () => {
    const result = serverSchema.safeParse({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/db",
      PYTHON_API_URL: "khong-phai-url",
    });
    expect(result.success).toBe(false);
  });

  it("từ chối CRAWL_MAX_PAGES ngoài khoảng 1–20 của backend", () => {
    const result = serverSchema.safeParse({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/db",
      PYTHON_API_URL: "http://127.0.0.1:8444",
      CRAWL_MAX_PAGES: "21",
    });
    expect(result.success).toBe(false);
  });

  it("đọc FALLBACK_TO_FIXTURE dạng chuỗi 'false'", () => {
    const parsed = serverSchema.parse({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/db",
      PYTHON_API_URL: "http://127.0.0.1:8444",
      FALLBACK_TO_FIXTURE: "false",
    });
    expect(parsed.FALLBACK_TO_FIXTURE).toBe(false);
  });
});
