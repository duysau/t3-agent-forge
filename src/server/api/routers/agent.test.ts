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
  voicePublish: null,
};

const PUBLISH_RESULT = {
  sessionId: "sid",
  siteName: "Sen Spa",
  facts: 70,
  knowledgeId: "kb_1",
  agentId: "ag_1",
  message: "Đã đẩy KB lên agent voice",
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

  /**
   * Build voice publish luôn KB lên agent voice nền tảng. Kết quả đó phải đi
   * tiếp tới UI: nếu router nuốt nó, một lượt build voice không có bằng chứng
   * nhìn thấy được nào là đã publish — kể cả khi nó đẩy 0 fact.
   */
  it("chuyển tiếp kết quả publish voice của lượt build ra ngoài", async () => {
    const agent = await h.seedAgent();
    const build = vi
      .fn()
      .mockResolvedValue({ ...BUILD_RESULT, voicePublish: PUBLISH_RESULT });

    const api = h.caller({ source: h.source({ build }) });
    await api.agent.setProduct({ slug: agent.slug, product: "voice" });

    const out = await api.agent.build({ slug: agent.slug });

    expect(out.voicePublish?.facts).toBe(70);
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

describe("agent.updateEvalAnswer", () => {
  /** Dựng một agent đã chấm điểm xong, trả về caller kèm run đang hiện. */
  const evaluated = async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    await api.agent.build({ slug: agent.slug });
    await api.agent.evaluate({ slug: agent.slug });
    const run = await api.agent.evalRun({ slug: agent.slug });
    return { agent, api, run: run! };
  };

  it("lưu câu trả lời đã sửa và đọc lại thấy đúng", async () => {
    const { agent, api, run } = await evaluated();

    const out = await api.agent.updateEvalAnswer({
      slug: agent.slug,
      runId: run.id,
      ord: 2,
      answer: "câu trả lời do người dùng sửa",
    });
    expect(out.answer).toBe("câu trả lời do người dùng sửa");

    const after = await api.agent.evalRun({ slug: agent.slug });
    expect(after?.results[2]?.answer).toBe("câu trả lời do người dùng sửa");
  });

  it("không làm lệch bảng tổng kết", async () => {
    const { agent, api, run } = await evaluated();
    await api.agent.updateEvalAnswer({ slug: agent.slug, runId: run.id, ord: 0, answer: "khác" });

    const after = await api.agent.evalRun({ slug: agent.slug });
    expect(after?.summary).toEqual(run.summary);
    expect(after?.results[0]?.score).toBe(run.results[0]?.score);
    expect(after?.results[0]?.passed).toBe(run.results[0]?.passed);
  });

  it("cắt khoảng trắng hai đầu trước khi lưu", async () => {
    const { agent, api, run } = await evaluated();
    await api.agent.updateEvalAnswer({
      slug: agent.slug,
      runId: run.id,
      ord: 1,
      answer: "   đã cắt   ",
    });

    const after = await api.agent.evalRun({ slug: agent.slug });
    expect(after?.results[1]?.answer).toBe("đã cắt");
  });

  it("từ chối câu trả lời rỗng hoặc toàn khoảng trắng", async () => {
    const { agent, api, run } = await evaluated();
    for (const answer of ["", "   "]) {
      await expect(
        api.agent.updateEvalAnswer({ slug: agent.slug, runId: run.id, ord: 0, answer }),
      ).rejects.toThrow();
    }
  });

  it("ord không tồn tại thì báo NOT_FOUND", async () => {
    const { agent, api, run } = await evaluated();
    await expect(
      api.agent.updateEvalAnswer({ slug: agent.slug, runId: run.id, ord: 99, answer: "x" }),
    ).rejects.toThrow(TRPCError);
  });

  it("slug không tồn tại thì báo NOT_FOUND", async () => {
    const { run } = await evaluated();
    await expect(
      h.caller().agent.updateEvalAnswer({ slug: "khong-co", runId: run.id, ord: 0, answer: "x" }),
    ).rejects.toThrow(/không tìm thấy agent/i);
  });

  /**
   * Run của agent khác không sửa được, kể cả khi biết UUID — nếu không, một slug bất
   * kỳ sẽ ghi đè được bảng điểm của agent khác.
   */
  it("không sửa được bảng điểm của agent khác", async () => {
    const victim = await evaluated();
    const attacker = await evaluated();

    await expect(
      attacker.api.agent.updateEvalAnswer({
        slug: attacker.agent.slug,
        runId: victim.run.id,
        ord: 0,
        answer: "xâm nhập",
      }),
    ).rejects.toThrow(TRPCError);

    const after = await victim.api.agent.evalRun({ slug: victim.agent.slug });
    expect(after?.results[0]?.answer).toBe(victim.run.results[0]?.answer);
  });
});

describe("agent.artifacts", () => {
  it("chưa dựng thì trả null", async () => {
    const agent = await h.seedAgent();
    expect(await h.caller().agent.artifacts({ slug: agent.slug })).toBeNull();
  });

  it("đã dựng thì trả persona, system prompt và guardrails đã lưu", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    const built = await api.agent.build({ slug: agent.slug });

    const stored = await api.agent.artifacts({ slug: agent.slug });

    expect(stored?.persona).toEqual(built.persona);
    expect(stored?.systemPrompt).toBe(built.systemPrompt);
    expect(stored?.guardrails).toEqual(built.guardrails);
  });

  it("slug không tồn tại thì NOT_FOUND", async () => {
    await expect(h.caller().agent.artifacts({ slug: "khongcogi12" })).rejects.toThrow(
      /NOT_FOUND|không tìm/i,
    );
  });
});

/**
 * Kịch bản mẫu (mode "fixture" ghi ở Bước 1) phải chạy được offline suốt Bước 3.
 *
 * Harness luôn tiêm MỘT fixture source vào ctx, nên một test chỉ "pass" không
 * chứng minh gì cả — phải phân biệt được ĐÃ DÙNG NGUỒN NÀO. Cách phân biệt ở đây:
 * agent lưu `fixtureKey: "bepnha"`, còn `ctx.source` là senspa với build/evaluate
 * bị ghi đè thành spy. Nếu code đọc `ctx.source`, spy được gọi và dữ liệu trả về
 * là của Sen Spa; nếu code đọc row, spy im lặng và dữ liệu là của Bếp Nhà.
 */
describe("nguồn dữ liệu lấy từ mode/fixtureKey đã lưu trên agent row", () => {
  const seedFixtureAgent = () =>
    h.seedAgent({ sourceUrl: "https://bepnha.vn", mode: "fixture", fixtureKey: "bepnha" });

  it("build agent mode fixture thì dùng fixture của row, không gọi nguồn live trong ctx", async () => {
    const agent = await seedFixtureAgent();
    const ctxBuild = vi.fn().mockResolvedValue(BUILD_RESULT);
    const api = h.caller({ source: h.source({ build: ctxBuild }) });
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });

    const out = await api.agent.build({ slug: agent.slug });

    expect(ctxBuild).not.toHaveBeenCalled();
    expect(out.persona.name).toBe("Na");
    expect(out.brandName).toBe("Bếp Nhà");
  });

  it("evaluate agent mode fixture thì chấm bằng fixture của row, không gọi nguồn live trong ctx", async () => {
    const agent = await seedFixtureAgent();
    const ctxEvaluate = vi.fn();
    const api = h.caller({ source: h.source({ evaluate: ctxEvaluate }) });
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    await api.agent.build({ slug: agent.slug });

    const out = await api.agent.evaluate({ slug: agent.slug });

    expect(ctxEvaluate).not.toHaveBeenCalled();
    expect(out.results[0]?.question).toBe("Nhà hàng mở cửa mấy giờ?");
  });

  it("agent mode live vẫn dùng nguồn trong ctx", async () => {
    const agent = await h.seedAgent();
    const ctxBuild = vi.fn().mockResolvedValue(BUILD_RESULT);
    const api = h.caller({ source: h.source({ build: ctxBuild }) });
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });

    await api.agent.build({ slug: agent.slug });

    expect(ctxBuild).toHaveBeenCalledTimes(1);
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

describe("agent.publishVoice", () => {
  /**
   * Agent voice trên nền tảng FPT là MỘT agent dùng chung: publish KB của
   * session nào là ghi đè lên nó, toàn cục. Nên trước mỗi cuộc gọi demo phải
   * đẩy lại KB của đúng agent đang xem — nguồn sự thật nằm ở nền tảng, không
   * phải ở DB của mình, nên không có cách nào "biết" mà bỏ qua bước này.
   */
  it("đẩy KB của session lên agent voice, đặt site_name theo tên thương hiệu", async () => {
    const agent = await h.seedAgent();
    const publishVoice = vi.fn().mockResolvedValue(PUBLISH_RESULT);

    const api = h.caller({ source: h.source({ publishVoice }) });
    await api.agent.setProduct({ slug: agent.slug, product: "voice" });
    await api.agent.build({ slug: agent.slug });

    const out = await api.agent.publishVoice({ slug: agent.slug });

    expect(out.facts).toBe(70);
    expect(publishVoice).toHaveBeenCalledWith({ sessionId: "sid", siteName: "Sen Spa" });
  });

  /**
   * `site_name` là tên data source hiện trên console FPT — nó là thứ duy nhất
   * để phân biệt lượt publish này với lượt của người khác trên cùng agent dùng
   * chung. Agent chưa build thì chưa có `brandName`, nhưng vẫn phải có tên.
   */
  it("thiếu tên thương hiệu thì lấy host của URL nguồn làm site_name", async () => {
    const agent = await h.seedAgent();
    const publishVoice = vi.fn().mockResolvedValue(PUBLISH_RESULT);

    const api = h.caller({ source: h.source({ publishVoice }) });
    await api.agent.setProduct({ slug: agent.slug, product: "voice" });

    await api.agent.publishVoice({ slug: agent.slug });

    expect(publishVoice).toHaveBeenCalledWith({ sessionId: "sid", siteName: "senspa.vn" });
  });

  it("từ chối khi agent chưa chọn sản phẩm voice", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });

    const err: unknown = await api.agent
      .publishVoice({ slug: agent.slug })
      .then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("BAD_REQUEST");
  });

  it("session chết thì hồi sinh rồi publish lại", async () => {
    const agent = await h.seedAgent();
    const publishVoice = vi
      .fn()
      .mockRejectedValueOnce(new AgentForgeError("session_missing", "chết", 404))
      .mockResolvedValueOnce(PUBLISH_RESULT);
    const restore = vi.fn().mockResolvedValue({ sessionId: "sid-moi", chunksIngested: 2 });

    const api = h.caller({ source: h.source({ publishVoice, restore }) });
    await api.agent.setProduct({ slug: agent.slug, product: "voice" });

    const out = await api.agent.publishVoice({ slug: agent.slug });

    expect(out.facts).toBe(70);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(publishVoice).toHaveBeenCalledTimes(2);
  });
});
