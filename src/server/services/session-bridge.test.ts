import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { AgentForgeError } from "~/server/agentforge/errors";
import { GENERIC_ERROR_MESSAGE } from "~/server/api/trpc";
import { getAgentById } from "~/server/db/queries/agents";
import { CRAWL_FIXTURE, makeHarness, type Harness } from "~/test/harness";
import { withSessionRecovery } from "./session-bridge";

let h: Harness;

// Session id mà harness ghi vào agent — dùng lại trong assertion để không hardcode hai nơi.
const LIVE_SESSION = CRAWL_FIXTURE.sessionId;

beforeEach(async () => {
  h = await makeHarness();
});
afterEach(async () => {
  await h.close();
});

describe("withSessionRecovery", () => {
  it("session còn sống thì gọi fn một lần với sessionId đã lưu", async () => {
    const agent = await h.seedAgent();
    const fn = vi.fn().mockResolvedValue("ok");
    const restore = vi.fn();

    const out = await withSessionRecovery({ db: h.db, source: h.source({ restore }) }, agent.id, fn);

    expect(out).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(LIVE_SESSION);
    expect(restore).not.toHaveBeenCalled();
  });

  it("session chết thì restore rồi thử lại đúng một lần", async () => {
    const agent = await h.seedAgent();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AgentForgeError("session_missing", "không thấy session", 404))
      .mockResolvedValueOnce("ok sau khi hồi sinh");
    const restore = vi.fn().mockResolvedValue({ sessionId: "sid-moi", chunksIngested: 2 });

    const out = await withSessionRecovery({ db: h.db, source: h.source({ restore }) }, agent.id, fn);

    expect(out).toBe("ok sau khi hồi sinh");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(2, "sid-moi");
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it("restore gửi đủ chunks và artifacts đã lưu", async () => {
    const agent = await h.seedAgent();
    const restore = vi.fn().mockResolvedValue({ sessionId: "sid-moi", chunksIngested: 2 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AgentForgeError("session_missing", "x", 404))
      .mockResolvedValueOnce("ok");

    await withSessionRecovery({ db: h.db, source: h.source({ restore }) }, agent.id, fn);

    const payload = restore.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.sessionId).toBe(LIVE_SESSION);
    expect(payload.chunks).toEqual(CRAWL_FIXTURE.chunks);
    expect(payload.kbFacts).toEqual(CRAWL_FIXTURE.kbFacts);
    expect(payload.url).toBe("https://senspa.vn");
  });

  /**
   * `persona` và `brand` đi thẳng vào body JSON của `POST /api/sessions/restore`,
   * một API snake_case. Persona được LƯU ở dạng đã transform (`avatarLetter`), nên
   * nếu không đổi ngược thì backend nhận một field nó không biết và mất avatar.
   * Test cũ tên là "restore gửi đủ chunks và artifacts đã lưu" nhưng chưa từng
   * chạm tới hai field này — nên lỗi sống sót qua cả 12 task.
   */
  it("restore gửi persona và brand ở wire shape snake_case, kèm cả emoji logo", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    await api.agent.build({ slug: agent.slug });

    const restore = vi.fn().mockResolvedValue({ sessionId: "sid-moi", chunksIngested: 2 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AgentForgeError("session_missing", "x", 404))
      .mockResolvedValueOnce("ok");

    await withSessionRecovery({ db: h.db, source: h.source({ restore }) }, agent.id, fn);

    const payload = restore.mock.calls[0]![0] as {
      persona: Record<string, unknown>;
      brand: Record<string, unknown>;
    };

    expect(payload.persona).toEqual({
      name: "Sen",
      role: "Nhân viên tư vấn Sen Spa",
      description: expect.any(String),
      avatar_letter: "S",
    });
    expect(payload.persona).not.toHaveProperty("avatarLetter");

    expect(payload.brand).toEqual({
      name: "Sen Spa",
      logo: "🌸",
      logo_letter: "S",
      color: "#203ADC",
      industry: "spa",
    });
  });

  it("agent chưa build thì persona là null, không phải một object rỗng vô nghĩa", async () => {
    const agent = await h.seedAgent();
    const restore = vi.fn().mockResolvedValue({ sessionId: "sid-moi", chunksIngested: 2 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AgentForgeError("session_missing", "x", 404))
      .mockResolvedValueOnce("ok");

    await withSessionRecovery({ db: h.db, source: h.source({ restore }) }, agent.id, fn);

    const payload = restore.mock.calls[0]![0] as { persona: unknown };
    expect(payload.persona).toBeNull();
  });

  it("lưu sessionId mới vào DB để lần sau không phải hồi sinh lại", async () => {
    const agent = await h.seedAgent();
    const restore = vi.fn().mockResolvedValue({ sessionId: "sid-moi", chunksIngested: 2 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new AgentForgeError("session_missing", "x", 404))
      .mockResolvedValueOnce("ok");

    await withSessionRecovery({ db: h.db, source: h.source({ restore }) }, agent.id, fn);

    const reloaded = await getAgentById(h.db, agent.id);
    expect(reloaded?.pythonSessionId).toBe("sid-moi");
  });

  it("lỗi lần hai được ném ra, KHÔNG hồi sinh vòng nữa", async () => {
    const agent = await h.seedAgent();
    const restore = vi.fn().mockResolvedValue({ sessionId: "sid-moi", chunksIngested: 2 });
    const fn = vi
      .fn()
      .mockRejectedValue(new AgentForgeError("session_missing", "vẫn không thấy", 404));

    await expect(
      withSessionRecovery({ db: h.db, source: h.source({ restore }) }, agent.id, fn),
    ).rejects.toMatchObject({ kind: "session_missing" });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it("lỗi KHÁC session_missing thì không hồi sinh gì cả", async () => {
    const agent = await h.seedAgent();
    const restore = vi.fn();
    const fn = vi.fn().mockRejectedValue(new AgentForgeError("upstream", "LLM lỗi", 502));

    await expect(
      withSessionRecovery({ db: h.db, source: h.source({ restore }) }, agent.id, fn),
    ).rejects.toMatchObject({ kind: "upstream" });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(restore).not.toHaveBeenCalled();
  });

  it("agent không tồn tại thì ném lỗi rõ ràng, không gọi fn", async () => {
    const fn = vi.fn();
    await expect(
      withSessionRecovery(
        { db: h.db, source: h.source() },
        "00000000-0000-0000-0000-000000000000",
        fn,
      ),
    ).rejects.toThrow(/không tìm thấy agent/i);
    expect(fn).not.toHaveBeenCalled();
  });

  it("agent chưa có sessionId thì ném lỗi rõ ràng, không gọi fn", async () => {
    const agent = await h.seedAgent({ crawl: { ...CRAWL_FIXTURE, sessionId: "" } });
    const fn = vi.fn();
    await expect(
      withSessionRecovery({ db: h.db, source: h.source() }, agent.id, fn),
    ).rejects.toThrow(/chưa có session/i);
    expect(fn).not.toHaveBeenCalled();
  });
});

/**
 * Mọi test trên gọi `withSessionRecovery` TRỰC TIẾP, nên chúng không thấy được
 * `mapErrors` — và đó chính là lý do lỗi này vô hình: một `Error` trần thành
 * `INTERNAL_SERVER_ERROR`, và `mapErrors` thay message bằng message chung để
 * không lộ chi tiết hạ tầng. Hai nửa đều đúng riêng lẻ; hợp lại thì lời hướng
 * dẫn tiếng Việt duy nhất giúp người dùng tự thoát bị xoá sổ.
 *
 * Nên các test dưới đây đi QUA caller, đúng đường mà người dùng đi.
 */
describe("lời hướng dẫn của withSessionRecovery đi được qua biên lỗi tRPC", () => {
  const NO_SESSION = /chưa có session Python/;

  async function catchError(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
      () => null,
      (e: unknown) => e,
    );
  }

  it("build agent thiếu session Python thì trả BAD_REQUEST kèm hướng dẫn crawl lại", async () => {
    const agent = await h.seedAgent({ crawl: { ...CRAWL_FIXTURE, sessionId: "" } });
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });

    const err = await catchError(api.agent.build({ slug: agent.slug }));

    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("BAD_REQUEST");
    expect((err as TRPCError).message).toMatch(NO_SESSION);
    expect((err as TRPCError).message).not.toBe(GENERIC_ERROR_MESSAGE);
  });

  it("chat với agent thiếu session Python cũng giữ nguyên hướng dẫn", async () => {
    const agent = await h.seedAgent({ crawl: { ...CRAWL_FIXTURE, sessionId: "" } });

    const err = await catchError(
      h.caller().chat.send({ slug: agent.slug, message: "hi", history: [] }),
    );

    expect((err as TRPCError).code).toBe("BAD_REQUEST");
    expect((err as TRPCError).message).toMatch(NO_SESSION);
  });
});
