import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Stepper } from "./stepper";

describe("Stepper", () => {
  it("hiện đủ bốn bước với tiêu đề tiếng Việt", () => {
    render(<Stepper current={1} onSelect={vi.fn()} canGoTo={() => true} />);
    expect(screen.getByText("Gắn nguồn")).toBeInTheDocument();
    expect(screen.getByText("Chọn sản phẩm")).toBeInTheDocument();
    expect(screen.getByText("Dựng & kiểm định")).toBeInTheDocument();
    expect(screen.getByText("Demo chia sẻ")).toBeInTheDocument();
  });

  it("đánh dấu bước hiện tại bằng aria-current", () => {
    render(<Stepper current={2} onSelect={vi.fn()} canGoTo={() => true} />);
    expect(screen.getByRole("button", { name: /Chọn sản phẩm/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("vô hiệu bước chưa tới được", () => {
    render(<Stepper current={1} onSelect={vi.fn()} canGoTo={(n) => n === 1} />);
    expect(screen.getByRole("button", { name: /Dựng & kiểm định/ })).toBeDisabled();
  });

  it("bấm bước tới được thì gọi onSelect với số bước", async () => {
    const onSelect = vi.fn();
    render(<Stepper current={2} onSelect={onSelect} canGoTo={() => true} />);
    await userEvent.click(screen.getByRole("button", { name: /Gắn nguồn/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("bấm bước bị vô hiệu thì không gọi onSelect", async () => {
    const onSelect = vi.fn();
    render(<Stepper current={1} onSelect={onSelect} canGoTo={(n) => n === 1} />);
    await userEvent.click(screen.getByRole("button", { name: /Demo chia sẻ/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
