import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { persistCrawl } from "~/server/services/agent-store";
import { AgentForgeError } from "~/server/agentforge/errors";
import { getLatestEvalRun } from "~/server/db/queries/eval";
import { CRAWL_FIXTURE, makeHarness, type Harness } from "~/test/harness";

const GENERIC_ERROR_MESSAGE = "Hệ thống gặp lỗi không mong muốn. Vui lòng thử lại.";

const BUILD_RESULT = {
  brand: { name: "Sen Spa", logo: "🌸", logoLetter: "S", color: "#203ADC", industry: "spa" },
  persona: {
    name: "Sen",
    role: "Nhân viên tư vấn",
    description: "Nhẹ nhàng, đúng bảng giá.",
    avatarLetter: "S",
  },
  systemPrompt: "Bạn là Sen, nhân viên tư vấn của Sen Spa.",
  guardrails: ["Không cam kết điều trị y khoa", "Không bịa giá"],
  industry: "spa",
};

let h: Harness;

beforeEach(async () => {
  h = await makeHarness();
});
afterEach(async () => {
  await h.close();
});

describe("agent.setProduct", () => {
  it("lưu product chat", async () => {
    const agent = await persistCrawl(h.db, { sourceUrl: "https://a.vn", mode: "live", crawl: CRAWL_FIXTURE });
    const out = await h.caller().agent.setProduct({ slug: agent.slug, product: "chat" });
    expect(out.product).toBe("chat");
    expect(out.voiceId).toBeNull();
  });

  it("lưu product voice kèm voiceId", async () => {
    const agent = await persistCrawl(h.db, { sourceUrl: "https://a.vn", mode: "live", crawl: CRAWL_FIXTURE });
    const out = await h.caller().agent.setProduct({
      slug: agent.slug,
      product: "voice",
      voiceId: "std_kimngan",
    });
    expect(out.product).toBe("voice");
    expect(out.voiceId).toBe("std_kimngan");
  });

  it("chọn chat thì xoá voiceId đã lưu trước đó", async () => {
    const agent = await persistCrawl(h.db, { sourceUrl: "https://a.vn", mode: "live", crawl: CRAWL_FIXTURE });
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "voice", voiceId: "std_minhquang" });
    const out = await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    expect(out.voiceId).toBeNull();
  });

  it("từ chối voiceId không nằm trong danh sách giọng đã chốt", async () => {
    const agent = await persistCrawl(h.db, { sourceUrl: "https://a.vn", mode: "live", crawl: CRAWL_FIXTURE });

    const err: unknown = await h.caller()
      .agent.setProduct({
        slug: agent.slug,
        product: "voice",
        // "giong_la" cố tình không thuộc voiceIdSchema; ép kiểu để test được giá
        // trị runtime không hợp lệ mà vẫn qua vòng kiểm tra kiểu của z.enum.
        voiceId: "giong_la" as never,
      })
      .then(() => null, (e: unknown) => e);

    // Đọc thẳng code trên TRPCError, không match theo prose: lỗi validation của
    // Zod (input schema) phải giữ đúng BAD_REQUEST, message không bị thay bằng
    // message chung của case lỗi không xác định.
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("BAD_REQUEST");
    expect((err as TRPCError).message).not.toBe(GENERIC_ERROR_MESSAGE);
  });

  it("product voice mà thiếu voiceId thì dùng giọng mặc định", async () => {
    const agent = await persistCrawl(h.db, { sourceUrl: "https://a.vn", mode: "live", crawl: CRAWL_FIXTURE });
    const out = await h.caller().agent.setProduct({ slug: agent.slug, product: "voice" });
    expect(out.voiceId).toBe("std_kimngan");
  });

  it("slug không tồn tại thì NOT_FOUND", async () => {
    await expect(
      h.caller().agent.setProduct({ slug: "khongcogi12", product: "chat" }),
    ).rejects.toThrow(/NOT_FOUND|không tìm/i);
  });
});

describe("agent.build", () => {
  it("dựng agent, lưu artifacts và đẩy status sang built", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });

    const out = await api.agent.build({ slug: agent.slug });

    expect(out.persona.name).toBeTruthy();
    expect(out.systemPrompt.length).toBeGreaterThan(0);
    expect(out.guardrails.length).toBeGreaterThan(0);

    const saved = await api.source.bySlug({ slug: agent.slug });
    expect(saved.status).toBe("built");
  });

  it("chưa chọn sản phẩm thì từ chối, không gọi backend", async () => {
    const agent = await h.seedAgent();
    const build = vi.fn();
    await expect(
      h.caller({ source: h.source({ build }) }).agent.build({ slug: agent.slug }),
    ).rejects.toThrow(/chưa chọn sản phẩm/i);
    expect(build).not.toHaveBeenCalled();
  });

  it("dùng product đã lưu ở DB, không nhận từ input", async () => {
    const agent = await h.seedAgent();
    const build = vi.fn().mockResolvedValue(BUILD_RESULT);
    const api = h.caller({ source: h.source({ build }) });
    await api.agent.setProduct({ slug: agent.slug, product: "voice", voiceId: "std_kimngan" });

    await api.agent.build({ slug: agent.slug });

    expect(build).toHaveBeenCalledWith(expect.objectContaining({ product: "voice" }));
  });

  it("session chết thì tự hồi sinh rồi build lại, người dùng không thấy lỗi", async () => {
    const agent = await h.seedAgent();
    const build = vi
      .fn()
      .mockRejectedValueOnce(new AgentForgeError("session_missing", "chết", 404))
      .mockResolvedValueOnce(BUILD_RESULT);
    const restore = vi.fn().mockResolvedValue({ sessionId: "sid-moi", chunksIngested: 2 });

    const api = h.caller({ source: h.source({ build, restore }) });
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });

    const out = await api.agent.build({ slug: agent.slug });

    expect(out.persona.name).toBe(BUILD_RESULT.persona.name);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it("slug không tồn tại thì NOT_FOUND", async () => {
    await expect(h.caller().agent.build({ slug: "khongcogi12" })).rejects.toThrow(
      /NOT_FOUND|không tìm/i,
    );
  });
});

describe("agent.evaluate", () => {
  it("chạy eval, lưu 20 kết quả và đẩy status sang evaluated", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    await api.agent.build({ slug: agent.slug });

    const out = await api.agent.evaluate({ slug: agent.slug });

    expect(out.total).toBe(20);
    expect(out.results).toHaveLength(20);
    expect(typeof out.avgScore).toBe("number");

    const saved = await api.source.bySlug({ slug: agent.slug });
    expect(saved.status).toBe("evaluated");
  });

  it("chưa build thì từ chối, không gọi backend", async () => {
    const agent = await h.seedAgent();
    const evaluate = vi.fn();
    const api = h.caller({ source: h.source({ evaluate }) });
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });

    await expect(api.agent.evaluate({ slug: agent.slug })).rejects.toThrow(/chưa dựng/i);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("chưa chọn sản phẩm thì từ chối, không gọi backend", async () => {
    const agent = await h.seedAgent();
    const evaluate = vi.fn();
    await expect(
      h.caller({ source: h.source({ evaluate }) }).agent.evaluate({ slug: agent.slug }),
    ).rejects.toThrow(/chưa chọn sản phẩm/i);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("kết quả đọc lại qua agent.evalRun khớp với lượt vừa chạy", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    await api.agent.build({ slug: agent.slug });
    const ran = await api.agent.evaluate({ slug: agent.slug });

    const stored = await api.agent.evalRun({ slug: agent.slug });
    expect(stored?.summary.passRate).toBe(ran.passRate);
    expect(stored?.results).toHaveLength(20);
  });
});

describe("agent.evalRun", () => {
  it("chưa chạy eval thì trả null", async () => {
    const agent = await h.seedAgent();
    expect(await h.caller().agent.evalRun({ slug: agent.slug })).toBeNull();
  });

  it("dựng lại sau khi eval thì ẩn bảng điểm cũ nhưng không xoá dữ liệu", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    await api.agent.build({ slug: agent.slug });
    await api.agent.evaluate({ slug: agent.slug });

    const beforeRebuild = await api.agent.evalRun({ slug: agent.slug });
    expect(beforeRebuild).not.toBeNull();

    await api.agent.build({ slug: agent.slug });

    const afterRebuild = await api.agent.evalRun({ slug: agent.slug });
    expect(afterRebuild).toBeNull();

    const stillStored = await getLatestEvalRun(h.db, agent.id);
    expect(stillStored).toBeDefined();
  });
});
