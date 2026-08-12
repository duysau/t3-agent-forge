import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./hero";

describe("Hero", () => {
  it("hiện tiêu đề đủ cả hai nửa, kể cả nửa tô gradient", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Dán website của bạn.30 phút sau có AI Agent chạy được.",
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

  it("có mascot kèm nhãn cho screen reader", () => {
    render(<Hero />);
    expect(screen.getByRole("img", { name: /vẫy tay/i })).toBeInTheDocument();
  });
});
