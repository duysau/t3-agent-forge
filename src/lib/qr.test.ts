import { describe, expect, it } from "vitest";
import { toQrDataUrl } from "./qr";

describe("toQrDataUrl", () => {
  it("trả về data URL ảnh PNG", async () => {
    const url = await toQrDataUrl("https://example.com/s/abc123");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    expect(url.length).toBeGreaterThan(100);
  });

  it("nội dung khác thì ảnh khác", async () => {
    const a = await toQrDataUrl("https://example.com/s/aaa");
    const b = await toQrDataUrl("https://example.com/s/bbb");
    expect(a).not.toBe(b);
  });

  it("chuỗi rỗng bị từ chối thay vì sinh QR vô nghĩa", async () => {
    await expect(toQrDataUrl("")).rejects.toThrow(/rỗng/i);
  });
});
