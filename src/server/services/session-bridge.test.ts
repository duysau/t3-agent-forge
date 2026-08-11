import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentForgeError } from "~/server/agentforge/errors";
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
