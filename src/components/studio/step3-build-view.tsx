"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Panel, PanelBody, PanelFoot, PanelSub, PanelTitle } from "~/components/ui/panel";
import type { EvalResult, Persona } from "~/server/agentforge/schemas";
import type { StoredEvalResult } from "~/server/db/queries/eval";
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
  evalResults: StoredEvalResult[];
  /**
   * Lượt kiểm định đang hiển thị. `null` khi bảng điểm vừa chạy xong và chưa đọc
   * lại từ DB — lúc đó chưa có địa chỉ nào để gửi một lần sửa tới, nên danh sách
   * ở chế độ chỉ đọc thay vì mời người dùng sửa rồi mới báo hỏng.
   */
  evalRunId: string | null;
  onSaveAnswer: (ord: number, answer: string) => Promise<void>;
  /**
   * True khi Bước 3 đã dựng lại màn hình từ dữ liệu đã lưu thay vì tự chạy. Đó là
   * đường DUY NHẤT mà auto-run bị chặn, nên cũng là đường duy nhất cần một nút dựng
   * lại tường minh — không có nó thì toàn bộ thiết kế "dựng lại thì ẩn bảng điểm cũ"
   * (status về `built`, `agent.evalRun`/`demo.bySlug` ngừng trả bảng điểm, hàng cũ
   * vẫn giữ) không còn đường nào chạm tới từ giao diện.
   */
  hydratedFromStored: boolean;
  onRetry: () => void;
  onBack: () => void;
  onContinue: () => void;
}

export function Step3BuildView(p: Step3ViewProps) {
  return (
    <Panel>
      <PanelBody>
        <PanelTitle>Dựng &amp; kiểm định</PanelTitle>
        <PanelSub>
          LLM sinh persona, system prompt và guardrails, rồi tự sinh 20 test case và tự chấm điểm.
        </PanelSub>

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
        {p.evalSummary && (
          <EvalTestList
            results={p.evalResults}
            onSaveAnswer={p.evalRunId ? p.onSaveAnswer : undefined}
          />
        )}

        {p.hydratedFromStored && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
            {/*
              Nút này tiêu 40+ lệnh gọi LLM vì một cú bấm có chủ đích, không phải để
              hồi phục sau một lỗi nhìn thấy được — nên hậu quả phải đọc được ngay
              cạnh nó: bảng điểm hiện tại sẽ bị thay.
            */}
            <p className="flex-1 text-[13px] text-muted-foreground">
              Dựng lại sẽ sinh persona và system prompt mới rồi chấm điểm lại 20 bài — mất vài
              phút và thay bảng điểm đang hiện.
            </p>
            {/*
              Dùng chính `onRetry` — tức chính `run()` mà đường thử lại dùng — nên ref
              `running` vẫn là thứ duy nhất chặn lượt chạy trùng. Không có đường dựng
              thứ hai.
            */}
            <Button variant="outline" size="sm" onClick={p.onRetry}>
              Dựng lại agent
            </Button>
          </div>
        )}
      </PanelBody>

      <PanelFoot>
        <Button variant="outline" onClick={p.onBack}>
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
        <Button onClick={p.onContinue} disabled={p.evalSummary === null}>
          Xem trang demo
          <ArrowRight className="size-4" />
        </Button>
      </PanelFoot>
    </Panel>
  );
}
