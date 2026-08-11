import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EvalTestList } from "./eval-test-list";
import type { EvalResult } from "~/server/agentforge/schemas";

const RESULTS: EvalResult["results"] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    question: `Grounded ${i + 1}`,
    answer: "a",
    score: 5,
    passed: true,
    reasoning: "đúng KB",
    category: "grounded" as const,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    question: `Trap ${i + 1}`,
    answer: "a",
    score: i === 0 ? 2 : 5,
    passed: i !== 0,
    reasoning: "từ chối đúng",
    category: "trap" as const,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    question: `Edge ${i + 1}`,
    answer: "a",
    score: 4,
    passed: true,
    reasoning: "chuyển tiếp",
    category: "edge" as const,
  })),
];

describe("EvalTestList", () => {
  it("mặc định hiện đủ 20 bài", () => {
    render(<EvalTestList results={RESULTS} />);
    expect(screen.getAllByTestId("eval-row")).toHaveLength(20);
  });

  it("filter grounded chỉ còn 8 bài", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(screen.getByRole("button", { name: /Grounded/ }));
    expect(screen.getAllByTestId("eval-row")).toHaveLength(8);
  });

  it("filter câu bẫy chỉ còn 6 bài", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(screen.getByRole("button", { name: /Câu bẫy/ }));
    expect(screen.getAllByTestId("eval-row")).toHaveLength(6);
  });

  it("filter chưa đạt chỉ còn bài trượt, bất kể nhóm nào", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(screen.getByRole("button", { name: /Cần bổ sung KB/ }));
    const rows = screen.getAllByTestId("eval-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Trap 1");
  });

  it("mỗi dòng hiện điểm và lý do", () => {
    render(<EvalTestList results={RESULTS.slice(0, 1)} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
    expect(screen.getByText("đúng KB")).toBeInTheDocument();
  });

  it("quay lại filter Tất cả thì hiện lại đủ 20", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(screen.getByRole("button", { name: /Grounded/ }));
    await userEvent.click(screen.getByRole("button", { name: /Tất cả/ }));
    expect(screen.getAllByTestId("eval-row")).toHaveLength(20);
  });
});
