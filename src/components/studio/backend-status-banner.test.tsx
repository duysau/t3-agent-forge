import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BackendStatusBannerView } from "./backend-status-banner";

describe("BackendStatusBannerView", () => {
  it("backend up thì không hiện gì", () => {
    const { container } = render(
      <BackendStatusBannerView backend="up" reason={null} checking={false} onRecheck={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("đang kiểm tra thì không hiện gì — tránh nháy banner mỗi lần tải trang", () => {
    const { container } = render(
      <BackendStatusBannerView backend="down" reason="x" checking onRecheck={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("backend down thì nói rõ đang chạy dữ liệu mẫu", () => {
    render(
      <BackendStatusBannerView
        backend="down"
        reason="Không kết nối được backend"
        checking={false}
        onRecheck={vi.fn()}
      />,
    );
    expect(screen.getByText(/Backend chưa kết nối/)).toBeInTheDocument();
    expect(screen.getByText(/dữ liệu mẫu/i)).toBeInTheDocument();
  });

  it("hiện lý do cụ thể để biết vì sao chết", () => {
    render(
      <BackendStatusBannerView
        backend="down"
        reason="Quá thời gian chờ 5000ms"
        checking={false}
        onRecheck={vi.fn()}
      />,
    );
    expect(screen.getByText(/Quá thời gian chờ 5000ms/)).toBeInTheDocument();
  });

  it("có nút kiểm tra lại", async () => {
    const onRecheck = vi.fn();
    const { default: userEvent } = await import("@testing-library/user-event");
    render(
      <BackendStatusBannerView backend="down" reason="x" checking={false} onRecheck={onRecheck} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Kiểm tra lại/ }));
    expect(onRecheck).toHaveBeenCalledTimes(1);
  });
});
