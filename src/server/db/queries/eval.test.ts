import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EvalResult } from "~/server/agentforge/schemas";
import { makeHarness, type Harness } from "~/test/harness";
import { getLatestEvalRun, saveEvalRun, updateEvalResultAnswer } from "./eval";

let h: Harness;

const EVAL: EvalResult = {
  summary: {
    passRate: 85,
    avgScore: 4.3,
    passed: 17,
    total: 20,
    breakdown: {
      grounded: { pass: 8, total: 8 },
      trap: { pass: 5, total: 6 },
      edge: { pass: 4, total: 6 },
    },
  },
  results: Array.from({ length: 20 }, (_, i) => ({
    question: `Câu hỏi ${i + 1}`,
    answer: `Trả lời ${i + 1}`,
    score: i < 17 ? 4.5 : 2,
    passed: i < 17,
    reasoning: `Lý do ${i + 1}`,
    category: i < 8 ? "grounded" : i < 14 ? "trap" : "edge",
  })),
};

beforeEach(async () => {
  h = await makeHarness();
});
afterEach(async () => {
  await h.close();
});

describe("saveEvalRun", () => {
  it("lưu summary và cả 20 kết quả", async () => {
    const agent = await h.seedAgent();
    const runId = await saveEvalRun(h.db, agent.id, EVAL);
    expect(runId).toBeTruthy();

    const run = await getLatestEvalRun(h.db, agent.id);
    expect(run?.summary.passRate).toBe(85);
    expect(run?.summary.total).toBe(20);
    expect(run?.results).toHaveLength(20);
  });

  it("giữ thứ tự 20 kết quả đúng như backend trả về", async () => {
    const agent = await h.seedAgent();
    await saveEvalRun(h.db, agent.id, EVAL);
    const run = await getLatestEvalRun(h.db, agent.id);
    expect(run?.results.map((r) => r.question)).toEqual(EVAL.results.map((r) => r.question));
  });

  it("avgScore đọc ra là NUMBER, không phải chuỗi", async () => {
    const agent = await h.seedAgent();
    await saveEvalRun(h.db, agent.id, EVAL);
    const run = await getLatestEvalRun(h.db, agent.id);

    expect(typeof run?.summary.avgScore).toBe("number");
    expect(run?.summary.avgScore).toBeCloseTo(4.3, 2);
  });

  it("score của từng kết quả đọc ra là NUMBER, không phải chuỗi", async () => {
    const agent = await h.seedAgent();
    await saveEvalRun(h.db, agent.id, EVAL);
    const run = await getLatestEvalRun(h.db, agent.id);

    expect(typeof run?.results[0]?.score).toBe("number");
    expect(run?.results[0]?.score).toBeCloseTo(4.5, 1);
  });

  it("giữ breakdown ba nhóm nguyên vẹn", async () => {
    const agent = await h.seedAgent();
    await saveEvalRun(h.db, agent.id, EVAL);
    const run = await getLatestEvalRun(h.db, agent.id);
    expect(run?.summary.breakdown).toEqual(EVAL.summary.breakdown);
  });

  it("giữ category và passed của từng bài", async () => {
    const agent = await h.seedAgent();
    await saveEvalRun(h.db, agent.id, EVAL);
    const run = await getLatestEvalRun(h.db, agent.id);
    expect(run?.results.filter((r) => r.category === "grounded")).toHaveLength(8);
    expect(run?.results.filter((r) => r.category === "trap")).toHaveLength(6);
    expect(run?.results.filter((r) => r.category === "edge")).toHaveLength(6);
    expect(run?.results.filter((r) => r.passed)).toHaveLength(17);
  });
});

describe("getLatestEvalRun", () => {
  it("chạy eval lần hai thì trả lần mới nhất, không trộn hai lần", async () => {
    const agent = await h.seedAgent();
    await saveEvalRun(h.db, agent.id, EVAL);
    await new Promise((r) => setTimeout(r, 5));
    await saveEvalRun(h.db, agent.id, {
      ...EVAL,
      summary: { ...EVAL.summary, passRate: 95, passed: 19 },
    });

    const run = await getLatestEvalRun(h.db, agent.id);
    expect(run?.summary.passRate).toBe(95);
    expect(run?.results).toHaveLength(20);
  });

  it("agent chưa chạy eval thì trả undefined", async () => {
    const agent = await h.seedAgent();
    expect(await getLatestEvalRun(h.db, agent.id)).toBeUndefined();
  });

  it("trả kèm ord của từng bài để sửa tay trỏ tới được", async () => {
    const agent = await h.seedAgent();
    await saveEvalRun(h.db, agent.id, EVAL);
    const run = await getLatestEvalRun(h.db, agent.id);
    expect(run?.results.map((r) => r.ord)).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });
});

describe("updateEvalResultAnswer", () => {
  it("sửa đúng một bài, không đụng bài khác", async () => {
    const agent = await h.seedAgent();
    const runId = await saveEvalRun(h.db, agent.id, EVAL);

    const ok = await updateEvalResultAnswer(h.db, agent.id, runId, 3, "câu trả lời đã sửa");
    expect(ok).toBe(true);

    const run = await getLatestEvalRun(h.db, agent.id);
    expect(run?.results[3]?.answer).toBe("câu trả lời đã sửa");
    expect(run?.results[2]?.answer).toBe("Trả lời 3");
    expect(run?.results[4]?.answer).toBe("Trả lời 5");
  });

  /**
   * Điểm là con số LLM-judge đã cho. Sửa lời văn câu trả lời KHÔNG được đụng tới nó,
   * nếu không bảng tổng kết phía trên sẽ lệch khỏi danh sách bên dưới.
   */
  it("không đụng tới score, passed hay category", async () => {
    const agent = await h.seedAgent();
    const runId = await saveEvalRun(h.db, agent.id, EVAL);
    await updateEvalResultAnswer(h.db, agent.id, runId, 0, "khác hẳn");

    const run = await getLatestEvalRun(h.db, agent.id);
    expect(run?.results[0]?.score).toBeCloseTo(4.5, 1);
    expect(run?.results[0]?.passed).toBe(true);
    expect(run?.results[0]?.category).toBe("grounded");
    expect(run?.summary.passRate).toBe(85);
    expect(run?.summary.passed).toBe(17);
  });

  it("ord không tồn tại thì trả false", async () => {
    const agent = await h.seedAgent();
    const runId = await saveEvalRun(h.db, agent.id, EVAL);
    expect(await updateEvalResultAnswer(h.db, agent.id, runId, 99, "x")).toBe(false);
  });

  /**
   * Chặn theo chủ sở hữu: một slug không được sửa bảng điểm của agent khác, kể cả
   * khi đoán đúng UUID của run.
   */
  it("run của agent khác thì trả false và không ghi gì", async () => {
    const mine = await h.seedAgent();
    const other = await h.seedAgent();
    const otherRunId = await saveEvalRun(h.db, other.id, EVAL);

    expect(await updateEvalResultAnswer(h.db, mine.id, otherRunId, 0, "xâm nhập")).toBe(false);

    const run = await getLatestEvalRun(h.db, other.id);
    expect(run?.results[0]?.answer).toBe("Trả lời 1");
  });

  /**
   * Sửa phải trúng đúng lượt đang xem. Một lượt dựng lại xen vào giữa thì lần sửa
   * cũ vẫn hạ cánh xuống run cũ, không nhảy sang bảng điểm mới.
   */
  it("sửa run cũ không đụng tới run mới hơn", async () => {
    const agent = await h.seedAgent();
    const oldRunId = await saveEvalRun(h.db, agent.id, EVAL);
    await new Promise((r) => setTimeout(r, 5));
    await saveEvalRun(h.db, agent.id, EVAL);

    expect(await updateEvalResultAnswer(h.db, agent.id, oldRunId, 0, "sửa vào run cũ")).toBe(true);

    const latest = await getLatestEvalRun(h.db, agent.id);
    expect(latest?.id).not.toBe(oldRunId);
    expect(latest?.results[0]?.answer).toBe("Trả lời 1");
  });
});
