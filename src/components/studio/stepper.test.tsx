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

  it("vòng số bước xong mang viền success, bước chưa tới mang viền trong suốt", () => {
    const { container } = render(<Stepper current={2} onSelect={vi.fn()} canGoTo={() => true} />);
    const circles = container.querySelectorAll("span[class*='rounded-full']");
    // Step 1 is done (current is 2)
    const doneCircle = circles[0]!;
    expect(doneCircle.className).toContain("border-2");
    expect(doneCircle.className).toContain("border-success");
    // Step 3 is not yet reached
    const unreachedCircle = circles[2]!;
    expect(unreachedCircle.className).toContain("border-2");
    expect(unreachedCircle.className).toContain("border-transparent");
  });

  it("nhãn bước không bị ẩn ở màn hẹp (không còn class hidden)", () => {
    // The label wrapper used to carry `hidden md:block`, which sets
    // display:none between 640-767px in a real browser. jsdom applies no
    // stylesheet so a rendered-visibility or accessible-name assertion would
    // pass identically whether the class is present or not — it cannot
    // reproduce the defect. Asserting the class itself is absent is the
    // actual mechanism that controls the bug, so it is what is checked here.
    const { container } = render(<Stepper current={2} onSelect={vi.fn()} canGoTo={() => true} />);
    const labelWrappers = container.querySelectorAll("nav > div > button > span");
    expect(labelWrappers.length).toBeGreaterThan(0);
    for (const wrapper of labelWrappers) {
      expect(wrapper.className).not.toContain("hidden");
    }
  });

  it("bước đã xong có tên hỗ trợ truy cập không trống", () => {
    render(<Stepper current={2} onSelect={vi.fn()} canGoTo={() => true} />);
    const doneButton = screen.getByRole("button", { name: /Gắn nguồn/ });
    expect(doneButton).toHaveAccessibleName();
  });
});
