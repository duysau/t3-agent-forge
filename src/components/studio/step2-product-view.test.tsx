import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Step2ProductView } from "./step2-product-view";

const base = {
  product: null,
  onSelect: vi.fn(),
  onBack: vi.fn(),
  onContinue: vi.fn(),
  saving: false,
};

describe("Step2ProductView", () => {
  it("hiện cả hai sản phẩm FPT.AI", () => {
    render(<Step2ProductView {...base} />);
    expect(screen.getByText("FPT AI Chat")).toBeInTheDocument();
    expect(screen.getByText("FPT AI Engage")).toBeInTheDocument();
  });

  it("chưa chọn gì thì nút Dựng agent bị vô hiệu", () => {
    render(<Step2ProductView {...base} />);
    expect(screen.getByRole("button", { name: /Dựng agent/ })).toBeDisabled();
  });

  it("chọn chat thì mở nút Dựng agent", () => {
    render(<Step2ProductView {...base} product="chat" />);
    expect(screen.getByRole("button", { name: /Dựng agent/ })).toBeEnabled();
  });

  /**
   * Dropdown giọng đã bị GỠ, có chủ đích.
   *
   * Giọng nằm trong Agent Profile của gateway (`voice`/`voiceSpeed` trong
   * `agents.local.yaml`) và do backend đặt lúc publish — frontend không có lời gọi
   * nào để đổi nó. Giữ một dropdown không điều khiển được gì là UI nói dối: người
   * demo chọn "Nam", nghe ra giọng nữ, và đi tìm lỗi ở chỗ không có lỗi.
   * Cột `voiceId` trong DB vẫn được ghi (mặc định) để không phải migration.
   */
  it("chọn voice thì KHÔNG có dropdown giọng, và nói rõ giọng do nền tảng quyết định", () => {
    render(<Step2ProductView {...base} product="voice" />);
    expect(screen.queryByLabelText(/Giọng đọc/)).not.toBeInTheDocument();
    expect(screen.getByText(/giọng.*(nền tảng|cấu hình)/i)).toBeInTheDocument();
  });

  it("bấm thẻ sản phẩm thì gọi onSelect", async () => {
    const onSelect = vi.fn();
    render(<Step2ProductView {...base} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("FPT AI Engage"));
    expect(onSelect).toHaveBeenCalledWith("voice");
  });

  it("bấm Quay lại thì gọi onBack", async () => {
    const onBack = vi.fn();
    render(<Step2ProductView {...base} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: /Quay lại/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("thẻ đang chọn được đánh dấu là đã chọn, thẻ chưa chọn thì không", () => {
    render(<Step2ProductView {...base} product="chat" />);
    const chatCard = screen.getByText("FPT AI Chat").closest("button");
    const voiceCard = screen.getByText("FPT AI Engage").closest("button");
    expect(chatCard).not.toBeNull();
    expect(voiceCard).not.toBeNull();
    /*
      Kiểm `aria-pressed` chứ không kiểm ký tự "✓" trong text như bản cũ. Dấu tick
      giờ là icon SVG (`Check` của lucide) nên không còn text node nào để so —
      nhưng quan trọng hơn: `aria-pressed` mới là thứ screen reader thật đọc để
      biết thẻ nào đang được chọn, còn một glyph trang trí (`aria-hidden`) thì
      không. Test giờ khoá đúng cái tín hiệu mang nghĩa.
    */
    expect(chatCard).toHaveAttribute("aria-pressed", "true");
    expect(voiceCard).toHaveAttribute("aria-pressed", "false");
  });
});
