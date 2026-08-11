import { act, render, screen, waitFor } from "@testing-library/react";
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

const { buildMutation, evaluateMutation } = vi.hoisted(() => ({
  buildMutation: { mutateAsync: vi.fn<(input: BuildInput) => Promise<BuildOutput>>() },
  evaluateMutation: { mutateAsync: vi.fn<(input: EvalInput) => Promise<EvalOutput>>() },
}));

vi.mock("~/trpc/react", () => ({
  api: {
    agent: {
      build: { useMutation: () => buildMutation },
      evaluate: { useMutation: () => evaluateMutation },
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

function renderStep3Build() {
  return render(
    <Step3Build slug="demo-agent" onEvaluated={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />,
  );
}

describe("Step3Build", () => {
  beforeEach(() => {
    buildMutation.mutateAsync.mockReset();
    evaluateMutation.mutateAsync.mockReset();
  });

  it("chạy build đúng một lần dù Strict Mode gọi effect hai lần", async () => {
    buildMutation.mutateAsync.mockResolvedValue(BUILT);
    evaluateMutation.mutateAsync.mockResolvedValue(EVALUATED);

    render(
      <StrictMode>
        <Step3Build
          slug="demo-agent"
          onEvaluated={vi.fn()}
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
});
