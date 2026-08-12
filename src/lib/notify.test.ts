import { describe, expect, it, vi } from "vitest";

const success = vi.fn();
vi.mock("sonner", () => ({ toast: { success } }));

const { notifyOk } = await import("./notify");

describe("notify", () => {
  it("notifyOk đẩy toast thành công với đúng nội dung", () => {
    notifyOk("Đã sinh mã QR");
    expect(success).toHaveBeenCalledWith("Đã sinh mã QR");
  });
});
