import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Step2ProductView } from "./step2-product-view";
import { Step3BuildView, type Step3ViewProps } from "./step3-build-view";

const PERSONA = { name: "Sen", role: "Tư vấn", description: "d", avatarLetter: "S" };
const SUMMARY = {
  passRate: 85,
  avgScore: 4.3,
  passed: 17,
  total: 20,
  breakdown: {
    grounded: { pass: 8, total: 8 },
    trap: { pass: 5, total: 6 },
    edge: { pass: 4, total: 6 },
  },
};

function props(over: Partial<Step3ViewProps> = {}): Step3ViewProps {
  return {
    lines: [],
    busy: null,
    error: null,
    artifacts: null,
    evalSummary: null,
    evalResults: [],
    hydratedFromStored: false,
    onRetry: vi.fn(),
    onBack: vi.fn(),
    onContinue: vi.fn(),
    ...over,
  };
}

describe("Step3BuildView", () => {
  it("chưa có kết quả thì nút Xem trang demo bị vô hiệu", () => {
    render(<Step3BuildView {...props()} />);
    expect(screen.getByRole("button", { name: /Xem trang demo/ })).toBeDisabled();
  });

  it("có bảng điểm rồi thì mở nút Xem trang demo", () => {
    render(<Step3BuildView {...props({ evalSummary: SUMMARY })} />);
    expect(screen.getByRole("button", { name: /Xem trang demo/ })).toBeEnabled();
  });

  it("hiện artifacts khi build xong", () => {
    render(
      <Step3BuildView
        {...props({
          artifacts: { persona: PERSONA, systemPrompt: "prompt", guardrails: ["g1"] },
        })}
      />,
    );
    expect(screen.getByText("Sen")).toBeInTheDocument();
  });

  it("đang chạy thì hiện số giây, không hiện phần trăm", () => {
    const { container } = render(
      <Step3BuildView {...props({ busy: { label: "Đang chấm điểm", elapsedSeconds: 77 } })} />,
    );
    expect(screen.getByText(/77 giây/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/%/);
  });

  it("lỗi thì hiện nguyên nhân kèm nút thử lại", async () => {
    const onRetry = vi.fn();
    render(<Step3BuildView {...props({ error: "Backend không xử lý được", onRetry })} />);
    expect(screen.getByText(/Backend không xử lý được/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Thử lại/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("bấm Quay lại thì gọi onBack", async () => {
    const onBack = vi.fn();
    render(<Step3BuildView {...props({ onBack })} />);
    await userEvent.click(screen.getByRole("button", { name: /Quay lại/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("có bảng điểm thì hiện đủ 20 dòng test", () => {
    const results = Array.from({ length: 20 }, (_, i) => ({
      question: `Q${i}`,
      answer: "a",
      score: 5,
      passed: true,
      reasoning: "r",
      category: "grounded" as const,
    }));
    render(<Step3BuildView {...props({ evalSummary: SUMMARY, evalResults: results })} />);
    expect(screen.getAllByTestId("eval-row")).toHaveLength(20);
  });

  /**
   * Bước 3 từng là bước duy nhất còn bọc trong `Card` của shadcn, nên đi 2 → 3 → 4
   * là thấy khung đổi: bo 16px → 12px, shadow-md → shadow-xs, thân 32px → 24px, và
   * mất cả chân `gray-25` lẫn hiệu ứng vào của panel. So thẳng với Bước 2 thì bất
   * biến "khung không đổi giữa các bước" được ghim lại, thay vì chỉ chép một chuỗi
   * class mà lần sau lệch nữa cũng không ai biết.
   */
  it("dùng đúng khung Panel như các bước khác", () => {
    const step3 = render(<Step3BuildView {...props()} />).container.firstElementChild;
    const step2 = render(
      <Step2ProductView
        product="chat"
        onSelect={vi.fn()}
        voiceId={null}
        onVoiceChange={vi.fn()}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        saving={false}
      />,
    ).container.firstElementChild;

    expect(step3?.className).toBe(step2?.className);
    expect(step3?.className).toContain("rounded-2xl");
    expect(step3?.className).toContain("animate-panel-fade");
  });
});
