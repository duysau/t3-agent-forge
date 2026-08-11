import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EvalResult } from "~/server/agentforge/schemas";
import { makeHarness, type Harness } from "~/test/harness";
import { getLatestEvalRun, saveEvalRun } from "./eval";

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

  it("avgScore và score đọc ra là NUMBER, không phải chuỗi", async () => {
    const agent = await h.seedAgent();
    await saveEvalRun(h.db, agent.id, EVAL);
    const run = await getLatestEvalRun(h.db, agent.id);

    expect(typeof run?.summary.avgScore).toBe("number");
    expect(run?.summary.avgScore).toBeCloseTo(4.3, 2);
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
});
