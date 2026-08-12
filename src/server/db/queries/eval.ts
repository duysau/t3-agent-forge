import { and, asc, desc, eq } from "drizzle-orm";
import type { EvalResult } from "~/server/agentforge/schemas";
import { evalResults, evalRuns } from "~/server/db/schema";
import type { Db } from "~/server/db/types";

/**
 * Một bài đã LƯU, khác một bài vừa nhận từ backend ở đúng một field: `ord`.
 *
 * `ord` là thứ chỉ tồn tại sau khi ghi xuống DB — nó là địa chỉ của hàng trong
 * lượt kiểm định, không phải dữ liệu backend trả về. Vì thế nó nằm ở đây chứ
 * không được nhét vào `evalResponse`: schema đó tả wire shape của backend, và
 * thêm một field DB vào đó là nói sai về những gì backend gửi.
 */
export type StoredEvalResult = EvalResult["results"][number] & { ord: number };

export interface StoredEvalRun {
  id: string;
  createdAt: Date;
  summary: EvalResult["summary"];
  results: StoredEvalResult[];
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

/**
 * Sửa tay câu trả lời của MỘT bài trong một lượt kiểm định.
 *
 * Địa chỉ của một bài là cặp `(evalRunId, ord)`, không phải `ord` một mình: `ord`
 * chỉ duy nhất TRONG một run, và một agent có nhiều run. Nhận `runId` từ client
 * cũng là có chủ đích — nó buộc lần sửa phải trúng đúng lượt mà người dùng đang
 * xem. Nếu hàm này tự tìm "run mới nhất", một lượt dựng lại xen vào giữa lúc người
 * dùng đang gõ sẽ khiến câu trả lời sửa tay hạ cánh xuống bảng điểm của prompt mới
 * — ghi đè một câu trả lời chưa ai đọc, và không ai biết chuyện đó đã xảy ra.
 *
 * `runId` được xác thực là thuộc `agentId`, nên một slug không thể sửa bảng điểm
 * của agent khác dù có đoán đúng UUID.
 *
 * KHÔNG chạm tới `score`, `passed` hay `summary`: đây là chỗ sửa lời văn của câu
 * trả lời, không phải chỗ chấm lại điểm. Điểm vẫn là con số LLM-judge đã cho, nên
 * bảng tổng kết phía trên vẫn khớp với danh sách bên dưới.
 *
 * Trả `false` khi không có hàng nào khớp (sai run, sai ord, hoặc run không thuộc
 * agent này) để tầng gọi biến nó thành lỗi tường minh thay vì báo thành công.
 */
export async function updateEvalResultAnswer(
  db: Db,
  agentId: string,
  runId: string,
  ord: number,
  answer: string,
): Promise<boolean> {
  const owned = await db
    .select({ id: evalRuns.id })
    .from(evalRuns)
    .where(and(eq(evalRuns.id, runId), eq(evalRuns.agentId, agentId)))
    .limit(1);

  if (!owned[0]) return false;

  const updated = await db
    .update(evalResults)
    .set({ answer })
    .where(and(eq(evalResults.evalRunId, runId), eq(evalResults.ord, ord)))
    .returning({ id: evalResults.id });

  return updated.length > 0;
}

export async function getLatestEvalRun(
  db: Db,
  agentId: string,
): Promise<StoredEvalRun | undefined> {
  const runs = await db
    .select()
    .from(evalRuns)
    .where(eq(evalRuns.agentId, agentId))
    // Secondary sort by id breaks ties on equal createdAt. id is a random UUID, so
    // this makes the tiebreak deterministic (same answer every time we ask), not
    // "newest wins" (there is no way to know which of two equal timestamps came
    // second). In practice an eval run takes 20s-3min and createdAt has microsecond
    // resolution, so two genuine runs cannot collide; this guards against
    // non-determinism, not a real production race.
    .orderBy(desc(evalRuns.createdAt), desc(evalRuns.id))
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
      // `ord` là địa chỉ để sửa tay một bài (xem `updateEvalResultAnswer`). Phải đọc
      // từ cột chứ không suy ra từ vị trí trong mảng: hai thứ này trùng nhau hôm nay
      // chỉ vì `saveEvalRun` ghi `ord` liên tục từ 0 và query này sắp theo `ord`.
      // Suy ra từ index là buộc một khoá bền vào một quy ước sắp xếp.
      ord: r.ord,
    })),
  };
}
