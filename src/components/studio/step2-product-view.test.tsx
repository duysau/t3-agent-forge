import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Step2ProductView } from "./step2-product-view";

const base = {
  product: null,
  onSelect: vi.fn(),
  voiceId: null,
  onVoiceChange: vi.fn(),
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

  it("chọn chat thì mở nút và KHÔNG hiện dropdown giọng", () => {
    render(<Step2ProductView {...base} product="chat" />);
    expect(screen.getByRole("button", { name: /Dựng agent/ })).toBeEnabled();
    expect(screen.queryByLabelText(/Giọng đọc/)).not.toBeInTheDocument();
  });

  it("chọn voice thì hiện trigger giọng, và giọng đang chọn hiện trên trigger", () => {
    render(<Step2ProductView {...base} product="voice" voiceId="std_kimngan" />);
    const trigger = screen.getByLabelText(/Giọng đọc/);
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("Nữ, miền Nam");
  });

  it("mở dropdown thì thấy đúng hai giọng đã chốt với backend", async () => {
    render(<Step2ProductView {...base} product="voice" voiceId="std_kimngan" />);
    await userEvent.click(screen.getByLabelText(/Giọng đọc/));
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Nữ, miền Nam", "Nam"]);
  });

  it("bấm thẻ sản phẩm thì gọi onSelect", async () => {
    const onSelect = vi.fn();
    render(<Step2ProductView {...base} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("FPT AI Engage"));
    expect(onSelect).toHaveBeenCalledWith("voice");
  });

  it("chọn giọng khác thì gọi onVoiceChange với id giọng", async () => {
    const onVoiceChange = vi.fn();
    render(
      <Step2ProductView {...base} product="voice" voiceId="std_kimngan" onVoiceChange={onVoiceChange} />,
    );
    await userEvent.click(screen.getByLabelText(/Giọng đọc/));
    await userEvent.click(await screen.findByRole("option", { name: "Nam" }));
    expect(onVoiceChange).toHaveBeenCalledWith("std_minhquang");
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
