import type { EvalResult } from "~/server/agentforge/schemas";

export type EvalCategory = "grounded" | "trap" | "edge";

/** `pass` = `score >= 4`, khớp đúng quy tắc của backend (endpoint.md, /api/eval). */
export function makeTest(
  category: EvalCategory,
  question: string,
  answer: string,
  score: number,
  reasoning: string,
): EvalResult["results"][number] {
  return { category, question, answer, score, passed: score >= 4, reasoning };
}

export function summarize(results: EvalResult["results"]): EvalResult["summary"] {
  const passed = results.filter((r) => r.passed).length;
  const avg = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const byCat = (c: EvalCategory) => {
    const list = results.filter((r) => r.category === c);
    return { pass: list.filter((r) => r.passed).length, total: list.length };
  };

  return {
    passRate: Math.round((passed / results.length) * 100),
    avgScore: Math.round(avg * 10) / 10,
    passed,
    total: results.length,
    breakdown: { grounded: byCat("grounded"), trap: byCat("trap"), edge: byCat("edge") },
  };
}
