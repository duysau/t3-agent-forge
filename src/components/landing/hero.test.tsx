import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "./hero";

describe("Hero", () => {
  it("hiện tiêu đề đủ cả hai nửa, kể cả nửa tô gradient", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Dán website của bạn.10 phút sau có AI Agent chạy được.",
    );
  });

  it("badge nói rõ đây là bản dùng thử miễn phí", () => {
    render(<Hero />);
    expect(screen.getByText(/Self-serve trial/)).toBeInTheDocument();
  });

  it("cả hai CTA đều dẫn tới khu studio", () => {
    render(<Hero />);
    for (const name of [/Tạo agent của tôi/, /Xem demo mẫu/]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", "#studio");
    }
  });

  it("CTA thứ hai nạp kịch bản mẫu, không chỉ nhảy anchor như CTA chính", async () => {
    // Lý do tồn tại: trước đây "Xem demo mẫu" chỉ có `href="#studio"` giống hệt
    // CTA chính, nên hai nhãn khác nhau dẫn tới cùng một chỗ và lời hứa "xem
    // demo mẫu" không được thực hiện. Test này khoá lại phần "nạp mẫu".
    const onTryExample = vi.fn();
    render(<Hero onTryExample={onTryExample} />);
    await userEvent.click(screen.getByRole("link", { name: /Xem demo mẫu/ }));
    expect(onTryExample).toHaveBeenCalledTimes(1);
  });

  it("CTA chính KHÔNG nạp kịch bản mẫu", async () => {
    const onTryExample = vi.fn();
    render(<Hero onTryExample={onTryExample} />);
    await userEvent.click(screen.getByRole("link", { name: /Tạo agent của tôi/ }));
    expect(onTryExample).not.toHaveBeenCalled();
  });

  it("có mascot kèm nhãn cho screen reader", () => {
    render(<Hero />);
    expect(screen.getByRole("img", { name: /vẫy tay/i })).toBeInTheDocument();
  });
});
