"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { notifyOk } from "~/lib/notify";
import type { EvalResult, Persona } from "~/server/agentforge/schemas";
import { Step3BuildView } from "./step3-build-view";
import type { TerminalLine } from "./build-terminal";

export function Step3Build({
  slug,
  onEvaluatedChange,
  onBack,
  onContinue,
}: {
  slug: string;
  /**
   * Bật/tắt cờ `evaluated` của wizard. Nhận boolean chứ không phải chỉ báo
   * "xong": một lượt dựng lại phải TẮT cờ đó, nếu không stepper vẫn mở được
   * Bước 4 trong lúc agent đang được dựng lại và bảng điểm đang là của prompt cũ.
   */
  onEvaluatedChange: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [busy, setBusy] = useState<{ label: string; elapsedSeconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Step3Artifacts | null>(null);
  const [evalSummary, setEvalSummary] = useState<EvalResult["summary"] | null>(null);
  const [evalResults, setEvalResults] = useState<EvalResult["results"]>([]);
  const [hydratedFromStored, setHydratedFromStored] = useState(false);

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

  // Đọc lại những gì đã lưu TRƯỚC khi quyết định có dựng hay không. Bước 3 được
  // render có điều kiện trong page.tsx, nên "Quay lại" từ Bước 4 rồi đi tiếp lại
  // là unmount → mount, và một lần auto-run vô điều kiện ở đây là 40+ lệnh gọi
  // LLM cho mỗi vòng như vậy.
  const storedRun = api.agent.evalRun.useQuery({ slug });
  const storedArtifacts = api.agent.artifacts.useQuery({ slug });

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;

    try {
      setError(null);
      // Dựng lại sinh system prompt mới, nên bảng điểm cũ thôi chấm cho agent
      // này. Đóng Bước 4 lại ngay khi lượt dựng bắt đầu — cùng quy tắc mà
      // `agent.evalRun` áp dụng ở phía server.
      onEvaluatedChange(false);
      setEvalSummary(null);
      setEvalResults([]);
      // Từ giây này màn hình không còn là ảnh của dữ liệu đã lưu nữa. Dữ liệu đó
      // KHÔNG bị xoá — chỉ ngừng được hiển thị, đúng quy tắc mà `agent.evalRun` và
      // `demo.bySlug` áp dụng phía server.
      setHydratedFromStored(false);
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
        onEvaluatedChange(true);
        notifyOk(`Kiểm định xong · ${scored.passed}/${scored.total} bài đạt`);
      } catch (err) {
        stopClock();
        setError(err instanceof Error ? err.message : "Không rõ nguyên nhân");
      }
    } finally {
      running.current = false;
    }
  }, [build, evaluate, onEvaluatedChange, slug, startClock, stopClock]);

  useEffect(() => {
    if (started.current) return;
    // Chưa biết đã có kết quả hay chưa thì chưa được quyết định gì — chờ hai
    // query xong. Auto-run trong lúc còn `isPending` là quay lại đúng cái bug này.
    if (storedRun.isPending || storedArtifacts.isPending) return;
    started.current = true;

    const queryError = storedRun.error ?? storedArtifacts.error;
    if (queryError) {
      // Không đọc được dữ liệu đã lưu thì KHÔNG đoán bằng cách dựng lại: đoán sai
      // là tiêu tiền. Báo lỗi và để người dùng bấm "Thử lại" nếu muốn.
      setError(queryError.message);
      return;
    }

    const stored = storedRun.data;
    const artifacts = storedArtifacts.data;
    if (stored && artifacts) {
      setArtifacts(artifacts);
      setEvalSummary(stored.summary);
      setEvalResults(stored.results);
      setLines([
        { kind: "ok", text: "Agent này đã dựng và chấm điểm xong — hiện lại kết quả đã lưu." },
        { kind: "ok", text: `Persona: ${artifacts.persona.name} · ${artifacts.persona.role}` },
        { kind: "ok", text: `${artifacts.guardrails.length} guardrails` },
        {
          kind: "ok",
          text: `${stored.summary.passed}/${stored.summary.total} bài đạt · pass rate ${stored.summary.passRate}%`,
        },
      ]);
      setHydratedFromStored(true);
      onEvaluatedChange(true);
      return;
    }

    void run();
  }, [
    onEvaluatedChange,
    run,
    storedArtifacts.data,
    storedArtifacts.error,
    storedArtifacts.isPending,
    storedRun.data,
    storedRun.error,
    storedRun.isPending,
  ]);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  return (
    <Step3BuildView
      lines={lines}
      busy={busy}
      error={error}
      artifacts={artifacts}
      evalSummary={evalSummary}
      evalResults={evalResults}
      hydratedFromStored={hydratedFromStored}
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
