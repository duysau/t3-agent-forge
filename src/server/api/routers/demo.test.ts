import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CRAWL_FIXTURE, makeHarness, type Harness } from "~/test/harness";
import { persistCrawl } from "~/server/services/agent-store";
import { getLatestEvalRun } from "~/server/db/queries/eval";

let h: Harness;

beforeEach(async () => {
  h = await makeHarness();
});
afterEach(async () => {
  await h.close();
});

describe("demo.bySlug", () => {
  it("trả brand, persona, guardrails và bảng điểm sau khi build + eval", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    await api.agent.build({ slug: agent.slug });
    await api.agent.evaluate({ slug: agent.slug });

    const demo = await api.demo.bySlug({ slug: agent.slug });

    expect(demo.brandName).toBeTruthy();
    expect(demo.persona?.name).toBeTruthy();
    expect(demo.guardrails.length).toBeGreaterThan(0);
    expect(demo.product).toBe("chat");
    expect(demo.evalSummary?.total).toBe(20);
    expect(demo.status).toBe("evaluated");
  });

  it("agent mới crawl xong thì persona null và evalSummary null, KHÔNG throw", async () => {
    const agent = await h.seedAgent();
    const demo = await h.caller().demo.bySlug({ slug: agent.slug });

    expect(demo.persona).toBeNull();
    expect(demo.evalSummary).toBeNull();
    expect(demo.status).toBe("draft");
    expect(demo.brandColor).toBe("#203ADC");
  });

  it("mang theo cờ degraded để trang demo hiện được badge dữ liệu mẫu", async () => {
    const agent = await persistCrawl(h.db, {
      sourceUrl: "https://senspa.vn",
      mode: "fixture",
      fixtureKey: "senspa",
      degraded: true,
      crawl: CRAWL_FIXTURE,
    });
    const demo = await h.caller().demo.bySlug({ slug: agent.slug });
    expect(demo.degraded).toBe(true);
  });

  it("slug không tồn tại thì NOT_FOUND", async () => {
    await expect(h.caller().demo.bySlug({ slug: "khongcogi12" })).rejects.toThrow(
      /NOT_FOUND|không tìm/i,
    );
  });

  // Test bổ sung, không có trong brief: cùng lỗ hổng gate mà Task 4 (agent.evalRun)
  // đã gặp — test "evalSummary null sau khi crawl" ở trên pass ngay cả khi không
  // có status check nào cả, vì đơn giản là chưa có run nào tồn tại. Test này build
  // lại SAU KHI đã có eval, để phân biệt "null vì status != evaluated" với
  // "null vì chưa từng eval". Bước cuối (getLatestEvalRun trực tiếp) là bước quan
  // trọng nhất: nó xác nhận hàng trong DB còn nguyên, không bị xoá — nếu thiếu bước
  // này, test sẽ pass y như vậy với một implementation xoá luôn eval run khi build
  // lại, đúng ngược lại với thiết kế (ẩn, không xoá).
  it("dựng lại agent sau khi eval thì demo ẩn bảng điểm cũ nhưng không xoá dữ liệu", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    await api.agent.build({ slug: agent.slug });
    await api.agent.evaluate({ slug: agent.slug });

    const beforeRebuild = await api.demo.bySlug({ slug: agent.slug });
    expect(beforeRebuild.evalSummary).toBeTruthy();
    expect(beforeRebuild.evalResults).toHaveLength(20);

    await api.agent.build({ slug: agent.slug });

    const afterRebuild = await api.demo.bySlug({ slug: agent.slug });
    expect(afterRebuild.evalSummary).toBeNull();
    expect(afterRebuild.evalResults).toHaveLength(0);

    const stillStored = await getLatestEvalRun(h.db, agent.id);
    expect(stillStored).toBeDefined();
  });
});
