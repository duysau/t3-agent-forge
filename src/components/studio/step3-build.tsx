"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import type { EvalResult, Persona } from "~/server/agentforge/schemas";
import { Step3BuildView } from "./step3-build-view";
import type { TerminalLine } from "./build-terminal";

export function Step3Build({
  slug,
  onEvaluated,
  onBack,
  onContinue,
}: {
  slug: string;
  onEvaluated: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [busy, setBusy] = useState<{ label: string; elapsedSeconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Step3Artifacts | null>(null);
  const [evalSummary, setEvalSummary] = useState<EvalResult["summary"] | null>(null);
  const [evalResults, setEvalResults] = useState<EvalResult["results"]>([]);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(false);
  const running = useRef(false);

  const stopClock = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setBusy(null);
  }, []);

  const startClock = useCallback((label: string) => {
    setBusy({ label, elapsedSeconds: 0 });
    timer.current = setInterval(
      () => setBusy((b) => (b ? { ...b, elapsedSeconds: b.elapsedSeconds + 1 } : b)),
      1000,
    );
  }, []);

  const build = api.agent.build.useMutation();
  const evaluate = api.agent.evaluate.useMutation();

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    try {
      setError(null);
      setLines([{ kind: "info", text: "Đang sinh persona, system prompt và guardrails…" }]);
      startClock("Đang dựng agent");

      try {
        const built = await build.mutateAsync({ slug });
        stopClock();
        setArtifacts(built);
        setLines((l) => [
          ...l,
          { kind: "ok", text: `Persona: ${built.persona.name} · ${built.persona.role}` },
          { kind: "ok", text: `${built.guardrails.length} guardrails` },
          { kind: "info", text: "Đang sinh 20 test case và chấm điểm bằng LLM-judge…" },
        ]);

        startClock("Đang chấm điểm");
        const scored = await evaluate.mutateAsync({ slug });
        stopClock();
        setEvalSummary(scored);
        setEvalResults(scored.results);
        setLines((l) => [
          ...l,
          { kind: "ok", text: `${scored.passed}/${scored.total} bài đạt · pass rate ${scored.passRate}%` },
          ...(scored.passed < scored.total
            ? [
                {
                  kind: "warn" as const,
                  text: `${scored.total - scored.passed} bài chưa đạt — xem chi tiết bên dưới`,
                },
              ]
            : []),
        ]);
        onEvaluated();
      } catch (err) {
        stopClock();
        setError(err instanceof Error ? err.message : "Không rõ nguyên nhân");
      }
    } finally {
      running.current = false;
    }
  }, [build, evaluate, onEvaluated, slug, startClock, stopClock]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  return (
    <Step3BuildView
      lines={lines}
      busy={busy}
      error={error}
      artifacts={artifacts}
      evalSummary={evalSummary}
      evalResults={evalResults}
      onRetry={() => void run()}
      onBack={onBack}
      onContinue={onContinue}
    />
  );
}

interface Step3Artifacts {
  persona: Persona;
  systemPrompt: string;
  guardrails: string[];
}
