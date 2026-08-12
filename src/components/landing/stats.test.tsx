import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stats } from "./stats";

describe("Stats", () => {
  it("hiện đủ ba con số, mỗi con số đi kèm đúng nhãn của nó", () => {
    render(<Stats />);
    const cell = (num: string) => screen.getByText(num).parentElement;
    expect(cell("30 phút")).toHaveTextContent(/onboarding thủ công/);
    expect(cell("20 bài test")).toHaveTextContent(/tự động chấm điểm/);
    expect(cell("Đa sản phẩm")).toHaveTextContent(/AI Chat, AI Engage/);
  });
});
