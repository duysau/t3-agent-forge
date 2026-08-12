import { describe, expect, it } from "vitest";
import { clientSchema, serverSchema } from "./env-schema";

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

  /**
   * Trần là 20 — đúng trần backend nhận. `frontend-handoff-1.md` §2.1 khuyên chỉ
   * gửi tới 10 (20 trang mất ~4 phút, có thể vượt budget fetch 3 phút của chính
   * backend), nhưng quyết định của dự án là giữ 20 — kèm `TIMEOUTS.crawl` 180s, tức
   * client có thể abort trước khi backend crawl xong. Đánh đổi đã biết.
   */
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

describe("clientSchema", () => {
  /**
   * Voice là tính năng CÓ THỂ THIẾU: gateway chạy ở một tiến trình khác, thường
   * chỉ có trên máy demo. Bắt buộc biến này nghĩa là một máy không dựng voice
   * không boot được cả app — đổi một tính năng thiếu thành một app chết.
   */
  it("thiếu NEXT_PUBLIC_VOICE_GATEWAY_URL vẫn hợp lệ", () => {
    const parsed = clientSchema.parse({});
    expect(parsed.NEXT_PUBLIC_VOICE_GATEWAY_URL).toBeUndefined();
  });

  /**
   * Tên profile khác nhau theo từng máy chạy gateway: gateway đang chạy lúc viết
   * đoạn này nạp `forge-mspq0g3v1`, không có `longchau` mà handoff ghi — gửi sai
   * tên thì gateway trả 404 `unknown_profile`. Mặc định giữ đúng tên trong
   * handoff, nhưng phải đổi được mà không sửa code.
   */
  it("NEXT_PUBLIC_VOICE_PROFILE mặc định là longchau và đổi được", () => {
    expect(clientSchema.parse({}).NEXT_PUBLIC_VOICE_PROFILE).toBe("longchau");
    expect(
      clientSchema.parse({ NEXT_PUBLIC_VOICE_PROFILE: "forge-mspq0g3v1" })
        .NEXT_PUBLIC_VOICE_PROFILE,
    ).toBe("forge-mspq0g3v1");
  });

  it("từ chối NEXT_PUBLIC_VOICE_GATEWAY_URL không phải URL", () => {
    const result = clientSchema.safeParse({ NEXT_PUBLIC_VOICE_GATEWAY_URL: "8787" });
    expect(result.success).toBe(false);
  });
});
