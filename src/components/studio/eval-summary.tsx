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
    <div className="mt-6 grid items-center gap-6 rounded-2xl bg-linear-135 from-fci-800 to-fci-600 px-7 py-6 text-white min-[900px]:grid-cols-[auto_1fr] max-[900px]:text-center">
      <div className="max-[900px]:mx-auto">
        <ScoreRing percent={summary.passRate} label="pass rate" />
      </div>
      <div>
        <h3 className="text-lg font-extrabold">Kết quả kiểm định</h3>
        <p className="mt-1 text-sm leading-relaxed opacity-90">
          {summary.passed}/{summary.total} bài đạt (điểm ≥ 4/5).
        </p>
        <div className="mt-3.5 flex flex-wrap gap-5">
          {cells.map((c) => (
            <div key={c.label} className="text-[13px]">
              <span className="block text-[17px] font-bold">{c.value}</span>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
