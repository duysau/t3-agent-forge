import { describe, expect, it } from "vitest";
import { createFixtureSource } from "./fixture-source";
import { fixtureKeyForUrl } from "~/lib/fixtures";
import { buildResponse, crawlResponse, evalResponse } from "./schemas";

describe("fixtureKeyForUrl", () => {
  it.each([
    ["https://senspa.vn", "senspa"],
    ["https://www.senspa.vn/bang-gia", "senspa"],
    ["https://bepnha.vn", "bepnha"],
  ])("%s → %s", (url, key) => {
    expect(fixtureKeyForUrl(url)).toBe(key);
  });

  it("domain lạ dùng senspa làm mặc định", () => {
    expect(fixtureKeyForUrl("https://mot-domain-la.com")).toBe("senspa");
  });

  it("URL rác cũng không ném lỗi", () => {
    expect(fixtureKeyForUrl("khong-phai-url")).toBe("senspa");
  });
});

describe("createFixtureSource", () => {
  const source = createFixtureSource("senspa", { delayMs: 0 });

  it("tự nhận kind fixture", () => {
    expect(source.kind).toBe("fixture");
  });

  it("crawl trả chunks và facts không rỗng", async () => {
    const r = await source.crawl({ url: "https://senspa.vn", maxPages: 5 });
    expect(r.chunks.length).toBeGreaterThan(0);
    expect(r.kbFacts.length).toBeGreaterThan(0);
    expect(r.totalChunks).toBe(r.chunks.length);
    expect(r.sessionId).toMatch(/^fixture-/);
  });

  it("eval trả đúng 20 test và tổng breakdown khớp total", async () => {
    const r = await source.evaluate({ sessionId: "x", product: "chat" });
    expect(r.results).toHaveLength(20);
    expect(r.summary.total).toBe(20);
    const sum =
      r.summary.breakdown.grounded.total +
      r.summary.breakdown.trap.total +
      r.summary.breakdown.edge.total;
    expect(sum).toBe(20);
    expect(r.summary.passed).toBe(r.results.filter((t) => t.passed).length);
  });

  it("có đúng 8 grounded, 6 trap, 6 edge", async () => {
    const r = await source.evaluate({ sessionId: "x", product: "chat" });
    const count = (c: string) => r.results.filter((t) => t.category === c).length;
    expect(count("grounded")).toBe(8);
    expect(count("trap")).toBe(6);
    expect(count("edge")).toBe(6);
  });

  it("chat trả reply khác nhau theo câu hỏi, không lặp một câu", async () => {
    const a = await source.chat({ sessionId: "x", message: "Giá bao nhiêu?", history: [] });
    const b = await source.chat({ sessionId: "x", message: "Mở cửa mấy giờ?", history: [] });
    expect(a.reply.length).toBeGreaterThan(0);
    expect(b.reply.length).toBeGreaterThan(0);
  });

  it("bepnha là fixture khác biệt, không phải bản sao senspa", async () => {
    const other = createFixtureSource("bepnha", { delayMs: 0 });
    const a = await source.build({ sessionId: "x", product: "chat" });
    const b = await other.build({ sessionId: "x", product: "voice" });
    expect(a.brand.name).not.toBe(b.brand.name);
    expect(a.systemPrompt).not.toBe(b.systemPrompt);
  });
});

describe("fixture thoả chính contract của backend", () => {
  it("dữ liệu fixture parse được bằng đúng schema dùng cho live", async () => {
    for (const key of ["senspa", "bepnha"] as const) {
      const source = createFixtureSource(key, { delayMs: 0 });
      const crawl = await source.crawl({ url: "https://x.vn", maxPages: 5 });
      const build = await source.build({ sessionId: "x", product: "chat" });
      const evaluated = await source.evaluate({ sessionId: "x", product: "chat" });

      // Đóng gói lại về snake_case rồi parse: chứng minh fixture không lệch contract.
      expect(
        crawlResponse.safeParse({
          session_id: crawl.sessionId,
          pages: crawl.pages,
          kb_facts: crawl.kbFacts,
          chunks: crawl.chunks,
          total_chunks: crawl.totalChunks,
        }).success,
      ).toBe(true);

      expect(
        buildResponse.safeParse({
          brand: { name: build.brand.name, logo_letter: build.brand.logoLetter, color: build.brand.color },
          persona: { ...build.persona, avatar_letter: build.persona.avatarLetter },
          system_prompt: build.systemPrompt,
          guardrails: build.guardrails,
          industry: build.industry,
        }).success,
      ).toBe(true);

      expect(
        evalResponse.safeParse({
          summary: {
            pass_rate: evaluated.summary.passRate,
            avg_score: evaluated.summary.avgScore,
            passed: evaluated.summary.passed,
            total: evaluated.summary.total,
            breakdown: evaluated.summary.breakdown,
          },
          results: evaluated.results.map((t) => ({ ...t, pass: t.passed })),
        }).success,
      ).toBe(true);
    }
  });
});
