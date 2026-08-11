import { render, screen, within } from "@testing-library/react";
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

const filters = () => within(screen.getByRole("group", { name: /Bộ lọc/ }));

describe("EvalTestList", () => {
  it("mặc định hiện đủ 20 bài", () => {
    render(<EvalTestList results={RESULTS} />);
    expect(screen.getAllByTestId("eval-row")).toHaveLength(20);
  });

  it("filter grounded chỉ còn 8 bài", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(filters().getByRole("button", { name: /Grounded/ }));
    expect(screen.getAllByTestId("eval-row")).toHaveLength(8);
  });

  it("filter câu bẫy chỉ còn 6 bài", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(filters().getByRole("button", { name: /Câu bẫy/ }));
    expect(screen.getAllByTestId("eval-row")).toHaveLength(6);
  });

  it("filter chưa đạt chỉ còn bài trượt, bất kể nhóm nào", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(filters().getByRole("button", { name: /Cần bổ sung KB/ }));
    const rows = screen.getAllByTestId("eval-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Trap 1");
  });

  it("dòng gập vẫn hiện điểm", () => {
    render(<EvalTestList results={RESULTS.slice(0, 1)} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it("lý do chỉ hiện sau khi bấm mở dòng", async () => {
    render(<EvalTestList results={RESULTS.slice(0, 1)} />);
    expect(screen.queryByText("đúng KB")).not.toBeInTheDocument();
    const row = screen.getByRole("button", { name: /Grounded 1/ });
    expect(row).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("đúng KB")).toBeInTheDocument();
  });

  it("bấm lần nữa thì gập lại", async () => {
    render(<EvalTestList results={RESULTS.slice(0, 1)} />);
    const row = screen.getByRole("button", { name: /Grounded 1/ });
    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(row);
    expect(row).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("đúng KB")).not.toBeInTheDocument();
  });

  it("nhóm edge case mang class token cat-edge", () => {
    const edgeRow = RESULTS.find((r) => r.category === "edge")!;
    render(<EvalTestList results={[edgeRow]} />);
    const badge = screen.getByText("edge case");
    expect(badge.className).toMatch(/\bcat-edge-bg\b/);
    expect(badge.className).toMatch(/\bcat-edge-fg\b/);
  });

  it("quay lại filter Tất cả thì hiện lại đủ 20", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(filters().getByRole("button", { name: /Grounded/ }));
    await userEvent.click(filters().getByRole("button", { name: /Tất cả/ }));
    expect(screen.getAllByTestId("eval-row")).toHaveLength(20);
  });

  /**
   * Trạng thái gập phải neo vào chính bài kiểm định, không vào vị trí trong danh
   * sách đã lọc — nếu neo vào vị trí thì đổi filter sẽ mở sẵn một bài mà người
   * dùng chưa từng bấm, tức là phơi ra câu trả lời họ không yêu cầu xem.
   */
  it("đổi filter không kéo trạng thái mở sang bài khác", async () => {
    render(<EvalTestList results={RESULTS} />);
    const grounded1 = screen.getByRole("button", { name: /Grounded 1/ });
    await userEvent.click(grounded1);
    expect(grounded1).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(filters().getByRole("button", { name: /Cần bổ sung KB/ }));

    const trap1 = screen.getByRole("button", { name: /Trap 1/ });
    expect(trap1).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("từ chối đúng")).not.toBeInTheDocument();
  });

  it("mở một bài trong filter rồi về Tất cả thì đúng bài đó còn mở", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(filters().getByRole("button", { name: /Câu bẫy/ }));
    await userEvent.click(screen.getByRole("button", { name: /Trap 1/ }));
    await userEvent.click(filters().getByRole("button", { name: /Tất cả/ }));

    expect(screen.getByRole("button", { name: /Trap 1/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Grounded 1/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("số thứ tự giữ đúng vị trí thật trong cả 20 bài khi đang lọc", async () => {
    render(<EvalTestList results={RESULTS} />);
    await userEvent.click(filters().getByRole("button", { name: /Câu bẫy/ }));
    const rows = screen.getAllByTestId("eval-row");
    expect(within(rows[0]!).getByText("09")).toBeInTheDocument();
    expect(within(rows[5]!).getByText("14")).toBeInTheDocument();
  });
});
