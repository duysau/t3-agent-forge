import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentForgeError } from "~/server/agentforge/errors";
import { makeHarness, type Harness } from "~/test/harness";

let h: Harness;

beforeEach(async () => {
  h = await makeHarness();
});
afterEach(async () => {
  await h.close();
});

describe("chat.send", () => {
  it("trả reply cho câu hỏi", async () => {
    const agent = await h.seedAgent();
    const out = await h.caller().chat.send({
      slug: agent.slug,
      message: "Giá massage bao nhiêu?",
      history: [],
    });
    expect(out.reply.length).toBeGreaterThan(0);
  });

  it("chuyển history của client xuống backend, không tự bỏ đi", async () => {
    const agent = await h.seedAgent();
    const chat = vi.fn().mockResolvedValue({ reply: "ok" });
    const history = [
      { role: "user" as const, content: "Xin chào" },
      { role: "assistant" as const, content: "Dạ em nghe" },
    ];

    await h.caller({ source: h.source({ chat }) }).chat.send({
      slug: agent.slug,
      message: "Giá bao nhiêu?",
      history,
    });

    expect(chat).toHaveBeenCalledWith({
      sessionId: "sid",
      message: "Giá bao nhiêu?",
      history,
    });
  });

  it("session chết thì hồi sinh rồi gửi lại, người dùng chỉ thấy reply", async () => {
    const agent = await h.seedAgent();
    const chat = vi
      .fn()
      .mockRejectedValueOnce(new AgentForgeError("session_missing", "chết", 404))
      .mockResolvedValueOnce({ reply: "reply sau hồi sinh" });
    const restore = vi.fn().mockResolvedValue({ sessionId: "sid-moi", chunksIngested: 1 });

    const out = await h.caller({ source: h.source({ chat, restore }) }).chat.send({
      slug: agent.slug,
      message: "hi",
      history: [],
    });

    expect(out.reply).toBe("reply sau hồi sinh");
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it("message rỗng bị input schema từ chối", async () => {
    const agent = await h.seedAgent();
    await expect(
      h.caller().chat.send({ slug: agent.slug, message: "   ", history: [] }),
    ).rejects.toThrow();
  });

  it("slug không tồn tại thì NOT_FOUND", async () => {
    await expect(
      h.caller().chat.send({ slug: "khongcogi12", message: "hi", history: [] }),
    ).rejects.toThrow(/NOT_FOUND|không tìm/i);
  });
});
