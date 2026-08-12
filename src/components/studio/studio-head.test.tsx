import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StudioHead } from "./studio-head";

describe("StudioHead", () => {
  it("hiện tên và mô tả studio", () => {
    render(<StudioHead onReset={vi.fn()} canReset={false} />);
    expect(screen.getByRole("heading", { name: /AgentForge Studio/ })).toBeInTheDocument();
  });

  it("chưa bắt đầu gì thì nút Bắt đầu lại bị vô hiệu", () => {
    render(<StudioHead onReset={vi.fn()} canReset={false} />);
    expect(screen.getByRole("button", { name: /Bắt đầu lại/ })).toBeDisabled();
  });

  it("đã có agent thì bấm Bắt đầu lại gọi onReset", async () => {
    const onReset = vi.fn();
    render(<StudioHead onReset={onReset} canReset />);
    await userEvent.click(screen.getByRole("button", { name: /Bắt đầu lại/ }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("nói rõ Bắt đầu lại không xoá dữ liệu đã lưu", () => {
    render(<StudioHead onReset={vi.fn()} canReset />);
    expect(screen.getByRole("button", { name: /Bắt đầu lại/ })).toHaveAttribute(
      "title",
      expect.stringMatching(/không xoá/i),
    );
  });
});
