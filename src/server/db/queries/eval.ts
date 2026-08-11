import { asc, desc, eq } from "drizzle-orm";
import type { EvalResult } from "~/server/agentforge/schemas";
import { evalResults, evalRuns } from "~/server/db/schema";
import type { Db } from "~/server/db/types";

export interface StoredEvalRun {
  id: string;
  createdAt: Date;
  summary: EvalResult["summary"];
  results: EvalResult["results"];
}

/**
 * Ghi một lượt kiểm định. Cả run và 20 kết quả nằm trong một transaction: một
 * bảng điểm chỉ có summary mà thiếu các bài là vô nghĩa, và người xem sẽ tin
 * vào con số mà không có gì đối chiếu.
 *
 * Cột `numeric` của Postgres đi vào/ra Drizzle dưới dạng **chuỗi**, nên ghi thì
 * `String(...)` còn đọc thì `Number(...)`. Đây là chỗ duy nhất trong app được
 * phép biết chi tiết đó.
 */
export async function saveEvalRun(
  db: Db,
  agentId: string,
  result: EvalResult,
): Promise<string> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(evalRuns)
      .values({
        agentId,
        passRate: Math.round(result.summary.passRate),
        avgScore: String(result.summary.avgScore),
        passed: result.summary.passed,
        total: result.summary.total,
        breakdown: result.summary.breakdown,
      })
      .returning();

    const run = rows[0];
    if (!run) throw new Error("saveEvalRun: insert không trả về row");

    if (result.results.length > 0) {
      await tx.insert(evalResults).values(
        result.results.map((r, i) => ({
          evalRunId: run.id,
          category: r.category,
          question: r.question,
          answer: r.answer,
          score: String(r.score),
          passed: r.passed,
          reasoning: r.reasoning,
          ord: i,
        })),
      );
    }

    return run.id;
  });
}

export async function getLatestEvalRun(
  db: Db,
  agentId: string,
): Promise<StoredEvalRun | undefined> {
  const runs = await db
    .select()
    .from(evalRuns)
    .where(eq(evalRuns.agentId, agentId))
    .orderBy(desc(evalRuns.createdAt))
    .limit(1);

  const run = runs[0];
  if (!run) return undefined;

  const rows = await db
    .select()
    .from(evalResults)
    .where(eq(evalResults.evalRunId, run.id))
    .orderBy(asc(evalResults.ord));

  return {
    id: run.id,
    createdAt: run.createdAt,
    summary: {
      passRate: run.passRate,
      avgScore: Number(run.avgScore),
      passed: run.passed,
      total: run.total,
      breakdown: run.breakdown as EvalResult["summary"]["breakdown"],
    },
    results: rows.map((r) => ({
      question: r.question,
      answer: r.answer,
      score: Number(r.score),
      passed: r.passed,
      reasoning: r.reasoning,
      category: r.category as EvalResult["results"][number]["category"],
    })),
  };
}
