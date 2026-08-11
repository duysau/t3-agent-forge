import { describe, expect, it, vi } from "vitest";

const success = vi.fn();
const warning = vi.fn();
vi.mock("sonner", () => ({ toast: { success, warning } }));

const { notifyOk, notifyWarn } = await import("./notify");

describe("notify", () => {
  it("notifyOk đẩy toast thành công với đúng nội dung", () => {
    notifyOk("Đã sinh mã QR");
    expect(success).toHaveBeenCalledWith("Đã sinh mã QR");
  });

  it("notifyWarn đẩy toast cảnh báo với đúng nội dung", () => {
    notifyWarn("Đang dùng dữ liệu mẫu");
    expect(warning).toHaveBeenCalledWith("Đang dùng dữ liệu mẫu");
  });
});
