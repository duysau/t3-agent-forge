"use client";

import { useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { cn } from "~/lib/utils";
import type { EvalResult } from "~/server/agentforge/schemas";

type Filter = "all" | "grounded" | "trap" | "edge" | "fail";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "grounded", label: "Grounded" },
  { key: "trap", label: "Câu bẫy" },
  { key: "edge", label: "Edge case" },
  { key: "fail", label: "⚠ Cần bổ sung KB" },
];

const CAT: Record<EvalResult["results"][number]["category"], { label: string; cls: string }> = {
  grounded: { label: "grounded", cls: "bg-fci-50 text-fci-700" },
  trap: { label: "câu bẫy", cls: "bg-warning-muted text-warning-strong" },
  edge: { label: "edge case", cls: "bg-cat-edge-bg text-cat-edge-fg" },
};

export function EvalTestList({ results }: { results: EvalResult["results"] }) {
  const [filter, setFilter] = useState<Filter>("all");
  /**
   * Neo theo vị trí trong `results` GỐC, không theo vị trí trong danh sách đã lọc.
   * Neo vào danh sách đã lọc là một lỗi thật: mở bài 01 ở "Tất cả" rồi bấm
   * "⚠ Cần bổ sung KB" sẽ thấy bài còn lại mở sẵn — phơi ra câu trả lời mà người
   * dùng chưa hề yêu cầu xem — và lọt theo cả chiều ngược lại. Prototype không gặp
   * chuyện này vì nó lọc bằng `display:none`, class `.tc.open` vẫn dính đúng dòng.
   *
   * Chỉ số gốc là mốc ổn định ở đây vì `results` không đổi trong suốt một lượt sống
   * của component: Bước 3 ẩn cả bảng điểm (`evalSummary` về null) khi dựng lại, nên
   * component unmount và state gập được dựng lại từ đầu cùng bộ kết quả mới.
   */
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (index: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  /** Giữ kèm chỉ số gốc để cả trạng thái gập và số thứ tự đều không đổi khi lọc. */
  const shown = results
    .map((r, index) => ({ r, index }))
    .filter(({ r }) => {
      if (filter === "all") return true;
      if (filter === "fail") return !r.passed;
      return r.category === filter;
    });

  return (
    <div className="mt-6">
      <div role="group" aria-label="Bộ lọc bài kiểm định" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-gray-600",
              filter === f.key && "border-fci-500 bg-fci-500 text-white",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {shown.map(({ r, index }) => (
          <li
            key={`${r.category}-${index}-${r.question}`}
            data-testid="eval-row"
            className={cn(
              "overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-sm",
              !r.passed && "border-warning/50 bg-warning-muted",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              aria-expanded={open.has(index)}
              className="flex w-full items-center gap-3 px-4 py-[13px] text-left"
            >
              <span className="w-6 shrink-0 font-mono text-xs text-gray-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-800">{r.question}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", CAT[r.category].cls)}>
                {CAT[r.category].label}
              </span>
              <span className="w-[42px] shrink-0 text-right font-mono text-[13px] font-bold">{r.score}/5</span>
              {r.passed ? (
                <Check className="size-[22px] shrink-0 text-success" />
              ) : (
                <TriangleAlert className="size-[22px] shrink-0 text-warning" />
              )}
            </button>
            {open.has(index) && (
              <div className="animate-panel-fade pr-4 pb-4 pl-[52px] text-[13.5px] text-gray-600">
                <p
                  className={cn(
                    "my-2 rounded-md border border-border bg-gray-25 px-3.5 py-3 leading-relaxed text-gray-700",
                    !r.passed && "border-[#fecaca] bg-error-muted",
                  )}
                >
                  {r.answer}
                </p>
                {r.reasoning && <p className="flex items-start gap-2 text-gray-500 italic">{r.reasoning}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
