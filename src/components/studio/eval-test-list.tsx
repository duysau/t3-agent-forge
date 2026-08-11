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
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  const shown = results.filter((r) => {
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
        {shown.map((r, i) => (
          <li
            key={`${r.category}-${i}-${r.question}`}
            data-testid="eval-row"
            className={cn(
              "overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-sm",
              !r.passed && "border-warning/50 bg-warning-muted",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={open.has(i)}
              className="flex w-full items-center gap-3 px-4 py-[13px] text-left"
            >
              <span className="w-6 shrink-0 font-mono text-xs text-gray-400">
                {String(i + 1).padStart(2, "0")}
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
            {open.has(i) && (
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
