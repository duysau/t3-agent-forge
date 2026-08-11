import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreRing } from "./score-ring";

describe("ScoreRing", () => {
  it("hiện phần trăm dưới dạng số nguyên", () => {
    render(<ScoreRing percent={85} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("0% thì vòng rỗng hoàn toàn", () => {
    render(<ScoreRing percent={0} />);
    const arc = screen.getByTestId("score-ring-arc");
    expect(Number(arc.getAttribute("stroke-dashoffset"))).toBeCloseTo(
      Number(arc.getAttribute("stroke-dasharray")),
      1,
    );
  });

  it("100% thì vòng đầy hoàn toàn", () => {
    render(<ScoreRing percent={100} />);
    const arc = screen.getByTestId("score-ring-arc");
    expect(Number(arc.getAttribute("stroke-dashoffset"))).toBeCloseTo(0, 1);
  });

  it("kẹp giá trị ngoài khoảng 0–100 thay vì vẽ vòng méo", () => {
    render(<ScoreRing percent={140} />);
    const arc = screen.getByTestId("score-ring-arc");
    expect(Number(arc.getAttribute("stroke-dashoffset"))).toBeGreaterThanOrEqual(0);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("nhận label tuỳ chọn", () => {
    render(<ScoreRing percent={85} label="pass rate" />);
    expect(screen.getByText("pass rate")).toBeInTheDocument();
  });
});
