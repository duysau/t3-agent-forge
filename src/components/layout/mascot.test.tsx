import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Mascot } from "./mascot";

describe("Mascot", () => {
  it("có nhãn tiếng Việt cho screen reader", () => {
    render(<Mascot />);
    expect(screen.getByRole("img", { name: /vẫy tay/i })).toBeInTheDocument();
  });

  it("hiện bong bóng lời chào", () => {
    render(<Mascot />);
    expect(screen.getByText(/Xin chào/)).toBeInTheDocument();
  });

  it("giữ đúng viewBox của prototype — toạ độ animation phụ thuộc vào nó", () => {
    render(<Mascot />);
    expect(screen.getByRole("img", { name: /vẫy tay/i })).toHaveAttribute("viewBox", "0 0 340 360");
  });

  it("id gradient có tiền tố riêng để không đụng id khác trong trang", () => {
    const { container } = render(<Mascot />);
    const ids = [...container.querySelectorAll("[id]")].map((n) => n.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id.startsWith("mascot-")).toBe(true);
  });
});
