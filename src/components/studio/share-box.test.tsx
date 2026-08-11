import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShareBox } from "./share-box";

const URL = "https://demo.local/s/abc123def456";

describe("ShareBox", () => {
  it("hiện link chia sẻ", () => {
    render(
      <ShareBox url={URL} qrDataUrl={null} onShowQr={vi.fn()} copied={false} onCopy={vi.fn()} />,
    );
    expect(screen.getByText(URL)).toBeInTheDocument();
  });

  it("bấm sao chép thì gọi onCopy", async () => {
    const onCopy = vi.fn();
    render(
      <ShareBox url={URL} qrDataUrl={null} onShowQr={vi.fn()} copied={false} onCopy={onCopy} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Sao chép/ }));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("đã sao chép thì đổi nhãn để người dùng biết đã xong", () => {
    render(
      <ShareBox url={URL} qrDataUrl={null} onShowQr={vi.fn()} copied onCopy={vi.fn()} />,
    );
    expect(screen.getByText(/Đã sao chép/)).toBeInTheDocument();
  });

  it("chưa sinh QR thì không có ảnh nào", () => {
    render(
      <ShareBox url={URL} qrDataUrl={null} onShowQr={vi.fn()} copied={false} onCopy={vi.fn()} />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("có QR thì hiện ảnh kèm alt tiếng Việt", () => {
    render(
      <ShareBox
        url={URL}
        qrDataUrl="data:image/png;base64,AAA"
        onShowQr={vi.fn()}
        copied={false}
        onCopy={vi.fn()}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "data:image/png;base64,AAA");
    expect(img).toHaveAccessibleName(/QR/i);
  });

  it("bấm mã QR thì gọi onShowQr", async () => {
    const onShowQr = vi.fn();
    render(
      <ShareBox url={URL} qrDataUrl={null} onShowQr={onShowQr} copied={false} onCopy={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Mã QR/ }));
    expect(onShowQr).toHaveBeenCalledTimes(1);
  });

  it("sao chép lỗi thì hiện thông báo hướng dẫn chép tay, không báo đã xong", () => {
    render(
      <ShareBox
        url={URL}
        qrDataUrl={null}
        onShowQr={vi.fn()}
        copied={false}
        onCopy={vi.fn()}
        copyError="Không tự sao chép được — hãy bôi đen và chép link ở trên."
      />,
    );
    expect(screen.getByText(/Không tự sao chép được/)).toBeInTheDocument();
    expect(screen.queryByText(/Đã sao chép/)).not.toBeInTheDocument();
  });
});
