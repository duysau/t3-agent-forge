import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EvalTestList } from "./eval-test-list";
import type { StoredEvalResult } from "~/server/db/queries/eval";

const RESULTS: StoredEvalResult[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    question: `Grounded ${i + 1}`,
    answer: "a",
    score: 5,
    passed: true,
    reasoning: "đúng KB",
    category: "grounded" as const,
    ord: i,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    question: `Trap ${i + 1}`,
    answer: "a",
    score: i === 0 ? 2 : 5,
    passed: i !== 0,
    reasoning: "từ chối đúng",
    category: "trap" as const,
    ord: 8 + i,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    question: `Edge ${i + 1}`,
    answer: "a",
    score: 4,
    passed: true,
    reasoning: "chuyển tiếp",
    category: "edge" as const,
    ord: 14 + i,
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

describe("EvalTestList — sửa câu trả lời", () => {
  const openFirstRow = async () => {
    await userEvent.click(screen.getByRole("button", { name: /Grounded 1/ }));
  };

  it("không có onSaveAnswer thì không mời sửa", async () => {
    render(<EvalTestList results={RESULTS.slice(0, 1)} />);
    await openFirstRow();
    expect(screen.queryByRole("button", { name: /Sửa câu trả lời/ })).not.toBeInTheDocument();
  });

  it("nút sửa chỉ hiện sau khi mở dòng", async () => {
    render(<EvalTestList results={RESULTS.slice(0, 1)} onSaveAnswer={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Sửa câu trả lời/ })).not.toBeInTheDocument();
    await openFirstRow();
    expect(screen.getByRole("button", { name: /Sửa câu trả lời/ })).toBeInTheDocument();
  });

  it("ô nhập mở ra mang sẵn câu trả lời hiện tại", async () => {
    render(<EvalTestList results={RESULTS.slice(0, 1)} onSaveAnswer={vi.fn()} />);
    await openFirstRow();
    await userEvent.click(screen.getByRole("button", { name: /Sửa câu trả lời/ }));
    expect(screen.getByRole("textbox")).toHaveValue("a");
  });

  it("lưu gửi đúng ord của bài và nội dung đã sửa", async () => {
    const onSaveAnswer = vi.fn().mockResolvedValue(undefined);
    render(<EvalTestList results={RESULTS} onSaveAnswer={onSaveAnswer} />);

    await userEvent.click(screen.getByRole("button", { name: /Trap 1/ }));
    await userEvent.click(screen.getByRole("button", { name: /Sửa câu trả lời/ }));
    const box = screen.getByRole("textbox");
    await userEvent.clear(box);
    await userEvent.type(box, "câu trả lời mới");
    await userEvent.click(screen.getByRole("button", { name: "Lưu" }));

    // Trap 1 là bài thứ 9 trong danh sách, tức ord 8 — không phải 0.
    expect(onSaveAnswer).toHaveBeenCalledWith(8, "câu trả lời mới");
  });

  it("cắt khoảng trắng thừa trước khi lưu", async () => {
    const onSaveAnswer = vi.fn().mockResolvedValue(undefined);
    render(<EvalTestList results={RESULTS.slice(0, 1)} onSaveAnswer={onSaveAnswer} />);
    await openFirstRow();
    await userEvent.click(screen.getByRole("button", { name: /Sửa câu trả lời/ }));
    const box = screen.getByRole("textbox");
    await userEvent.clear(box);
    await userEvent.type(box, "  đã cắt  ");
    await userEvent.click(screen.getByRole("button", { name: "Lưu" }));

    expect(onSaveAnswer).toHaveBeenCalledWith(0, "đã cắt");
  });

  it("từ chối lưu câu trả lời rỗng, không gọi server", async () => {
    const onSaveAnswer = vi.fn();
    render(<EvalTestList results={RESULTS.slice(0, 1)} onSaveAnswer={onSaveAnswer} />);
    await openFirstRow();
    await userEvent.click(screen.getByRole("button", { name: /Sửa câu trả lời/ }));
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.click(screen.getByRole("button", { name: "Lưu" }));

    expect(onSaveAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/không được để trống/i);
    // Ô nhập phải còn đó để người dùng sửa tiếp.
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("huỷ thì bỏ bản nháp và không gọi server", async () => {
    const onSaveAnswer = vi.fn();
    render(<EvalTestList results={RESULTS.slice(0, 1)} onSaveAnswer={onSaveAnswer} />);
    await openFirstRow();
    await userEvent.click(screen.getByRole("button", { name: /Sửa câu trả lời/ }));
    await userEvent.type(screen.getByRole("textbox"), "gõ dở");
    await userEvent.click(screen.getByRole("button", { name: "Huỷ" }));

    expect(onSaveAnswer).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("a")).toBeInTheDocument();
  });

  /**
   * Lưu hỏng mà vẫn đóng ô nhập là ném mất đoạn người dùng vừa gõ — họ không có
   * cách nào lấy lại, và màn hình trông như đã lưu xong.
   */
  it("lưu hỏng thì giữ nguyên ô nhập kèm lý do", async () => {
    const onSaveAnswer = vi.fn().mockRejectedValue(new Error("Mất kết nối"));
    render(<EvalTestList results={RESULTS.slice(0, 1)} onSaveAnswer={onSaveAnswer} />);
    await openFirstRow();
    await userEvent.click(screen.getByRole("button", { name: /Sửa câu trả lời/ }));
    const box = screen.getByRole("textbox");
    await userEvent.clear(box);
    await userEvent.type(box, "sửa rồi");
    await userEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Mất kết nối"));
    expect(screen.getByRole("textbox")).toHaveValue("sửa rồi");
  });

  /**
   * Bản nháp neo theo `ord`, không theo vị trí trong danh sách đã lọc. Nếu neo sai,
   * đổi filter sẽ kéo ô nhập đang gõ dở sang một bài khác — và cú "Lưu" tiếp theo
   * ghi đè lên bài không liên quan.
   */
  it("đổi filter không kéo ô nhập sang bài khác", async () => {
    render(<EvalTestList results={RESULTS} onSaveAnswer={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Grounded 1/ }));
    await userEvent.click(screen.getByRole("button", { name: /Sửa câu trả lời/ }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    await userEvent.click(filters().getByRole("button", { name: /Cần bổ sung KB/ }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("Escape đóng ô nhập mà không lưu", async () => {
    const onSaveAnswer = vi.fn();
    render(<EvalTestList results={RESULTS.slice(0, 1)} onSaveAnswer={onSaveAnswer} />);
    await openFirstRow();
    await userEvent.click(screen.getByRole("button", { name: /Sửa câu trả lời/ }));
    await userEvent.type(screen.getByRole("textbox"), "{Escape}");

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onSaveAnswer).not.toHaveBeenCalled();
  });
});
