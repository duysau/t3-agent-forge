"use client";

import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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

export function EvalTestList({ results }: { results: EvalResult["results"] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const shown = results.filter((r) => {
    if (filter === "all") return true;
    if (filter === "fail") return !r.passed;
    return r.category === filter;
  });

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {shown.map((r, i) => (
          <li
            key={`${r.category}-${i}-${r.question}`}
            data-testid="eval-row"
            className={cn(
              "rounded-xl border p-4",
              r.passed ? "border-border" : "border-warning/50 bg-warning-muted",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={r.passed ? "success" : "warning"}>{r.score}/5</Badge>
              <Badge variant="secondary">{r.category}</Badge>
              <span className="font-medium text-gray-900">{r.question}</span>
            </div>
            <p className="mt-2 text-[13px] text-gray-700">{r.answer}</p>
            {r.reasoning && (
              <p className="mt-1 text-[13px] text-muted-foreground">{r.reasoning}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
