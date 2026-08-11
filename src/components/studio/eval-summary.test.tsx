import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvalSummary } from "./eval-summary";
import type { EvalResult } from "~/server/agentforge/schemas";

// Mọi số trong fixture đều khác nhau để một crosswire copy-paste (ví dụ nhãn
// "Câu bẫy" hiển thị số của "grounded") chắc chắn làm sai một giá trị hiển thị.
const SUMMARY: EvalResult["summary"] = {
  passRate: 80,
  avgScore: 4.25,
  passed: 16,
  total: 20,
  breakdown: {
    grounded: { pass: 7, total: 8 },
    trap: { pass: 5, total: 6 },
    edge: { pass: 4, total: 6 },
  },
};

describe("EvalSummary", () => {
  it("hiện đúng số của từng nhóm, không lẫn giữa các nhóm", () => {
    render(<EvalSummary summary={SUMMARY} />);
    expect(screen.getByText("7/8")).toBeInTheDocument();
    expect(screen.getByText("5/6")).toBeInTheDocument();
    expect(screen.getByText("4/6")).toBeInTheDocument();
  });

  it("hiện điểm trung bình với một chữ số sau dấu phẩy", () => {
    render(<EvalSummary summary={SUMMARY} />);
    expect(screen.getByText("4.3")).toBeInTheDocument();
  });

  it("hiện tổng số bài đạt trên tổng số bài", () => {
    render(<EvalSummary summary={SUMMARY} />);
    expect(screen.getByText(/16\/20/)).toBeInTheDocument();
  });

  it("truyền passRate cho ScoreRing để hiện vòng tròn phần trăm", () => {
    render(<EvalSummary summary={SUMMARY} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
  });
});
