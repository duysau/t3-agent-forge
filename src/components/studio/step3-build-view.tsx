"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { EvalResult, Persona } from "~/server/agentforge/schemas";
import { ArtifactCards } from "./artifact-cards";
import { BuildTerminal, type TerminalLine } from "./build-terminal";
import { EvalSummary } from "./eval-summary";
import { EvalTestList } from "./eval-test-list";

export interface Step3ViewProps {
  lines: TerminalLine[];
  busy: { label: string; elapsedSeconds: number } | null;
  error: string | null;
  artifacts: { persona: Persona; systemPrompt: string; guardrails: string[] } | null;
  evalSummary: EvalResult["summary"] | null;
  evalResults: EvalResult["results"];
  onRetry: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function Step3BuildView(p: Step3ViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dựng &amp; kiểm định</CardTitle>
        <CardDescription>
          LLM sinh persona, system prompt và guardrails, rồi tự sinh 20 test case và tự chấm điểm.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <BuildTerminal lines={p.lines} busy={p.busy} />

        {p.error && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-error-muted px-4 py-3">
            <p className="flex-1 text-sm text-error-strong">{p.error}</p>
            {/*
              KHÔNG có `disabled` ở đây, và đó là có chủ đích: nút này chỉ render
              khi `error` khác null, còn `run()` xoá `error` trước khi đặt `busy`
              và xoá `busy` trước khi đặt `error` — nên nút không bao giờ tồn tại
              trong lúc đang chạy. Một `disabled={p.busy !== null}` ở đây là mồi
              giả, ngụ ý rằng chính nó chặn việc bấm lại; thứ thật sự chặn là ref
              `running` trong `run()`.
            */}
            <Button variant="outline" size="sm" onClick={p.onRetry}>
              Thử lại
            </Button>
          </div>
        )}

        {p.artifacts && (
          <ArtifactCards
            persona={p.artifacts.persona}
            systemPrompt={p.artifacts.systemPrompt}
            guardrails={p.artifacts.guardrails}
          />
        )}

        {p.evalSummary && <EvalSummary summary={p.evalSummary} />}
        {p.evalSummary && <EvalTestList results={p.evalResults} />}
      </CardContent>

      <CardFooter className="justify-between border-t">
        <Button variant="outline" onClick={p.onBack}>
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
        <Button onClick={p.onContinue} disabled={p.evalSummary === null}>
          Xem trang demo
          <ArrowRight className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
