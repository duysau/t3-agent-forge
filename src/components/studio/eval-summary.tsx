import { Card, CardContent } from "~/components/ui/card";
import { ScoreRing } from "./score-ring";
import type { EvalResult } from "~/server/agentforge/schemas";

export function EvalSummary({ summary }: { summary: EvalResult["summary"] }) {
  const cells = [
    { label: "Grounded", value: `${summary.breakdown.grounded.pass}/${summary.breakdown.grounded.total}` },
    { label: "Câu bẫy", value: `${summary.breakdown.trap.pass}/${summary.breakdown.trap.total}` },
    { label: "Edge case", value: `${summary.breakdown.edge.pass}/${summary.breakdown.edge.total}` },
    { label: "Điểm TB /5", value: summary.avgScore.toFixed(1) },
  ];

  return (
    <Card className="mt-6">
      <CardContent className="flex flex-wrap items-center gap-8">
        <ScoreRing percent={summary.passRate} label="pass rate" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900">Kết quả kiểm định</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {summary.passed}/{summary.total} bài đạt (điểm ≥ 4/5).
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {cells.map((c) => (
              <div key={c.label} className="rounded-lg bg-muted px-3 py-2">
                <div className="font-bold text-gray-900">{c.value}</div>
                <div className="text-[11px] text-muted-foreground">{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
