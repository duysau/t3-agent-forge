import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EvalResult, Persona } from "~/server/agentforge/schemas";
import { Step3Build } from "./step3-build";
import type { Step3ViewProps } from "./step3-build-view";

interface BuildInput {
  slug: string;
}
interface BuildOutput {
  persona: Persona;
  systemPrompt: string;
  guardrails: string[];
}
interface EvalInput {
  slug: string;
}
type EvalOutput = EvalResult["summary"] & { results: EvalResult["results"] };

interface StoredRun {
  summary: EvalResult["summary"];
  results: EvalResult["results"];
}
interface QueryState<T> {
  data: T | undefined;
  isPending: boolean;
  error: { message: string } | null;
}

const { buildMutation, evaluateMutation, evalRunQuery, artifactsQuery } = vi.hoisted(() => ({
  buildMutation: { mutateAsync: vi.fn<(input: BuildInput) => Promise<BuildOutput>>() },
  evaluateMutation: { mutateAsync: vi.fn<(input: EvalInput) => Promise<EvalOutput>>() },
  // Hai query mà Bước 3 đọc TRƯỚC khi quyết định có dựng hay không.
  evalRunQuery: {
    data: null,
    isPending: false,
    error: null,
  } as QueryState<StoredRun | null>,
  artifactsQuery: {
    data: null,
    isPending: false,
    error: null,
  } as QueryState<BuildOutput | null>,
}));

vi.mock("~/trpc/react", () => ({
  api: {
    agent: {
      build: { useMutation: () => buildMutation },
      evaluate: { useMutation: () => evaluateMutation },
      evalRun: { useQuery: (_input: { slug: string }) => evalRunQuery },
      artifacts: { useQuery: (_input: { slug: string }) => artifactsQuery },
    },
  },
}));

// Captures the container's latest `onRetry` callback so a test can invoke it
// directly, bypassing the "Thử lại" button and its `disabled` DOM state entirely.
// That disabled state is a UI courtesy, not the correctness guarantee — the
// real guard is the `running` ref inside `run()` — so the re-entrancy test
// below must go around the button, not through it.
const retryProbe = vi.hoisted(() => ({ onRetry: null as (() => void) | null }));

vi.mock("./step3-build-view", async () => {
  const actual = await vi.importActual<typeof import("./step3-build-view")>("./step3-build-view");
  function Step3BuildView(props: Step3ViewProps) {
    retryProbe.onRetry = props.onRetry;
    return actual.Step3BuildView(props);
  }
  return { ...actual, Step3BuildView };
});

const PERSONA: Persona = { name: "Sen", role: "Tư vấn", description: "d", avatarLetter: "S" };
const BUILT: BuildOutput = { persona: PERSONA, systemPrompt: "prompt", guardrails: ["g1"] };
const EVALUATED: EvalOutput = {
  passRate: 100,
  avgScore: 5,
  passed: 1,
  total: 1,
  breakdown: {
    grounded: { pass: 1, total: 1 },
    trap: { pass: 0, total: 0 },
    edge: { pass: 0, total: 0 },
  },
  results: [],
};
const STORED_RUN: StoredRun = {
  summary: {
    passRate: EVALUATED.passRate,
    avgScore: EVALUATED.avgScore,
    passed: EVALUATED.passed,
    total: EVALUATED.total,
    breakdown: EVALUATED.breakdown,
  },
  results: [],
};

function renderStep3Build(onEvaluatedChange: (value: boolean) => void = vi.fn()) {
  return render(
    <Step3Build
      slug="demo-agent"
      onEvaluatedChange={onEvaluatedChange}
      onBack={vi.fn()}
      onContinue={vi.fn()}
    />,
  );
}

describe("Step3Build", () => {
  beforeEach(() => {
    buildMutation.mutateAsync.mockReset();
    evaluateMutation.mutateAsync.mockReset();
    evalRunQuery.data = null;
    evalRunQuery.isPending = false;
    evalRunQuery.error = null;
    artifactsQuery.data = null;
    artifactsQuery.isPending = false;
    artifactsQuery.error = null;
  });

  it("chạy build đúng một lần dù Strict Mode gọi effect hai lần", async () => {
    buildMutation.mutateAsync.mockResolvedValue(BUILT);
    evaluateMutation.mutateAsync.mockResolvedValue(EVALUATED);

    render(
      <StrictMode>
        <Step3Build
          slug="demo-agent"
          onEvaluatedChange={vi.fn()}
          onBack={vi.fn()}
          onContinue={vi.fn()}
        />
      </StrictMode>,
    );

    await waitFor(() => expect(evaluateMutation.mutateAsync).toHaveBeenCalledTimes(1));

    expect(buildMutation.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("chờ build xong mới gọi eval", async () => {
    let resolveBuild!: (value: BuildOutput) => void;
    buildMutation.mutateAsync.mockImplementation(
      () =>
        new Promise<BuildOutput>((resolve) => {
          resolveBuild = resolve;
        }),
    );
    evaluateMutation.mutateAsync.mockResolvedValue(EVALUATED);

    renderStep3Build();

    await waitFor(() => expect(buildMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(evaluateMutation.mutateAsync).not.toHaveBeenCalled();

    await act(async () => {
      resolveBuild(BUILT);
    });

    await waitFor(() => expect(evaluateMutation.mutateAsync).toHaveBeenCalledTimes(1));
  });

  it("build lỗi thì dừng lại, không chạy eval", async () => {
    buildMutation.mutateAsync.mockRejectedValue(new Error("Backend không xử lý được"));

    renderStep3Build();

    expect(await screen.findByText(/Backend không xử lý được/)).toBeInTheDocument();
    expect(evaluateMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("gọi Thử lại hai lần liên tiếp thì không chạy build hai lần đồng thời", async () => {
    buildMutation.mutateAsync.mockRejectedValueOnce(new Error("Backend không xử lý được"));

    renderStep3Build();

    expect(await screen.findByText(/Backend không xử lý được/)).toBeInTheDocument();
    expect(buildMutation.mutateAsync).toHaveBeenCalledTimes(1);

    let resolveRetryBuild!: (value: BuildOutput) => void;
    buildMutation.mutateAsync.mockImplementation(
      () =>
        new Promise<BuildOutput>((resolve) => {
          resolveRetryBuild = resolve;
        }),
    );
    evaluateMutation.mutateAsync.mockResolvedValue(EVALUATED);

    // Gọi trực tiếp onRetry hai lần trong cùng một lượt đồng bộ — đi vòng qua nút
    // "Thử lại" và trạng thái disabled của nó, để chỉ riêng ref `running` chặn
    // lượt gọi thứ hai (không phải vì nút bị vô hiệu trong DOM).
    act(() => {
      retryProbe.onRetry?.();
      retryProbe.onRetry?.();
    });

    expect(buildMutation.mutateAsync).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveRetryBuild(BUILT);
    });

    await waitFor(() => expect(evaluateMutation.mutateAsync).toHaveBeenCalledTimes(1));
  });

  it("đã có bảng điểm đã lưu thì hiện lại từ dữ liệu đó, KHÔNG dựng lại", async () => {
    evalRunQuery.data = STORED_RUN;
    artifactsQuery.data = BUILT;
    const onEvaluatedChange = vi.fn();

    renderStep3Build(onEvaluatedChange);

    await act(async () => {
      await Promise.resolve();
    });

    expect(buildMutation.mutateAsync).not.toHaveBeenCalled();
    expect(evaluateMutation.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/hiện lại kết quả đã lưu/i)).toBeInTheDocument();
    // Artifacts và bảng điểm phải thật sự lên màn hình, không chỉ là "không chạy gì".
    expect(screen.getByTestId("system-prompt")).toHaveTextContent("prompt");
    expect(screen.getByText("Kết quả kiểm định")).toBeInTheDocument();
    expect(onEvaluatedChange).toHaveBeenCalledWith(true);
  });

  /**
   * Đây là chính cái bug: page.tsx render Bước 3 có điều kiện, nên "Quay lại" từ
   * Bước 4 rồi đi tiếp lại là unmount → mount, và ref `running` (per-instance)
   * không giúp gì được. Mỗi vòng như vậy từng là thêm một lượt build + eval, tức
   * 40+ lệnh gọi LLM, không ai bấm gì cả.
   */
  it("mount lại sau khi đã build+eval thì không tiêu thêm một lượt nào", async () => {
    buildMutation.mutateAsync.mockResolvedValue(BUILT);
    evaluateMutation.mutateAsync.mockResolvedValue(EVALUATED);

    const first = renderStep3Build();
    await waitFor(() => expect(evaluateMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(buildMutation.mutateAsync).toHaveBeenCalledTimes(1);
    first.unmount();

    // Server giờ đã có run + artifacts của lượt vừa rồi — đúng những gì
    // agent.evalRun/agent.artifacts sẽ trả về khi Bước 3 mount lại.
    evalRunQuery.data = STORED_RUN;
    artifactsQuery.data = BUILT;

    renderStep3Build();

    // Cho mọi promise/effect của lượt mount thứ hai chạy xong TRƯỚC khi đếm —
    // nếu không, một lượt build mới vẫn đang treo sẽ lọt qua assertion.
    await act(async () => {
      await Promise.resolve();
    });

    expect(buildMutation.mutateAsync).toHaveBeenCalledTimes(1);
    expect(evaluateMutation.mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/hiện lại kết quả đã lưu/i)).toBeInTheDocument();
  });

  /**
   * Vòng tròn khép kín của thiết kế "dựng lại thì ẩn bảng điểm cũ".
   *
   * Không có nút này, một agent đã có bảng điểm KHÔNG CÒN CÁCH NÀO dựng lại được từ
   * giao diện — auto-run bị chặn đúng đắn, còn "Thử lại" chỉ render trong khối lỗi.
   * Nghĩa là cả thiết kế phía server (status về `built`, `agent.evalRun` và
   * `demo.bySlug` ngừng trả bảng điểm đã chấm cho một prompt không còn tồn tại, hàng
   * cũ giữ lại chứ không xoá) không còn đường nào chạm tới từ sản phẩm.
   *
   * Nên test này không kiểm "nút gọi build" — nó kiểm vòng tròn: hydrate một agent
   * đã có bảng điểm, bấm dựng lại, và bảng điểm cũ thôi được TRÌNH BÀY trong khi dữ
   * liệu đã lưu vẫn còn nguyên. Đúng cặp assertion mà `demo.test.ts` và
   * `agent.test.ts` đã làm phía server.
   */
  it("dựng lại từ trạng thái đã hydrate: ẩn bảng điểm cũ, dữ liệu đã lưu vẫn còn", async () => {
    evalRunQuery.data = STORED_RUN;
    artifactsQuery.data = BUILT;
    let resolveBuild!: (value: BuildOutput) => void;
    buildMutation.mutateAsync.mockImplementation(
      () =>
        new Promise<BuildOutput>((resolve) => {
          resolveBuild = resolve;
        }),
    );
    evaluateMutation.mutateAsync.mockResolvedValue(EVALUATED);
    const onEvaluatedChange = vi.fn();

    renderStep3Build(onEvaluatedChange);

    expect(await screen.findByText("Kết quả kiểm định")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Dựng lại agent/i }));

    // Bảng điểm cũ chấm cho một system prompt đang bị thay — không được hiện nữa.
    expect(screen.queryByText("Kết quả kiểm định")).not.toBeInTheDocument();
    // Và stepper không được mở Bước 4 dựa trên bảng điểm đó.
    expect(onEvaluatedChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: /Xem trang demo/ })).toBeDisabled();
    // Dữ liệu đã lưu KHÔNG bị xoá — chỉ ngừng hiển thị.
    expect(evalRunQuery.data).toBe(STORED_RUN);
    // Đúng một lượt dựng, qua đúng `run()` mà đường thử lại dùng.
    expect(buildMutation.mutateAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveBuild(BUILT);
    });

    await waitFor(() => expect(evaluateMutation.mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onEvaluatedChange).toHaveBeenCalledWith(true));
    expect(await screen.findByText("Kết quả kiểm định")).toBeInTheDocument();
  });

  it("chưa hydrate từ dữ liệu đã lưu thì không có nút dựng lại", async () => {
    buildMutation.mutateAsync.mockResolvedValue(BUILT);
    evaluateMutation.mutateAsync.mockResolvedValue(EVALUATED);

    renderStep3Build();

    await waitFor(() => expect(evaluateMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: /Dựng lại agent/i })).not.toBeInTheDocument();
  });

  it("hai query còn pending thì chưa quyết định gì, không dựng", async () => {
    evalRunQuery.isPending = true;
    evalRunQuery.data = undefined;
    artifactsQuery.isPending = true;
    artifactsQuery.data = undefined;

    renderStep3Build();

    await waitFor(() => expect(screen.getByText(/agentforge · build/)).toBeInTheDocument());
    expect(buildMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it("dựng lại thì tắt cờ evaluated trước, để stepper không mở Bước 4 giữa lượt dựng", async () => {
    let resolveBuild!: (value: BuildOutput) => void;
    buildMutation.mutateAsync.mockImplementation(
      () =>
        new Promise<BuildOutput>((resolve) => {
          resolveBuild = resolve;
        }),
    );
    evaluateMutation.mutateAsync.mockResolvedValue(EVALUATED);
    const onEvaluatedChange = vi.fn();

    renderStep3Build(onEvaluatedChange);

    await waitFor(() => expect(buildMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(onEvaluatedChange).toHaveBeenCalledWith(false);
    expect(onEvaluatedChange).not.toHaveBeenCalledWith(true);

    await act(async () => {
      resolveBuild(BUILT);
    });

    await waitFor(() => expect(onEvaluatedChange).toHaveBeenCalledWith(true));
  });

  it("đọc dữ liệu đã lưu lỗi thì báo lỗi, KHÔNG đoán bằng cách dựng lại", async () => {
    evalRunQuery.error = { message: "Không đọc được bảng điểm đã lưu" };
    evalRunQuery.data = undefined;

    renderStep3Build();

    expect(await screen.findByText(/Không đọc được bảng điểm đã lưu/)).toBeInTheDocument();
    expect(buildMutation.mutateAsync).not.toHaveBeenCalled();
  });
});
