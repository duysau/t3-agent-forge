import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { AgentForgeError } from "~/server/agentforge/errors";
import { updateAgent } from "~/server/db/queries/agents";
import { makeHarness, type Harness } from "~/test/harness";
import type { PersistCrawlInput } from "~/server/services/agent-store";
import type { AgentRow } from "~/server/db/types";

let h: Harness;

beforeEach(async () => {
  h = await makeHarness();
});
afterEach(async () => {
  await h.close();
});

/**
 * `chat.send` chặn agent chưa dựng, nên mọi test về đường chat bình thường phải
 * seed một agent ĐÃ dựng. Đẩy status thẳng bằng `updateAgent` thay vì chạy
 * `agent.build` để test chat không phụ thuộc vào đường build.
 */
async function seedBuiltAgent(over: Partial<PersistCrawlInput> = {}): Promise<AgentRow> {
  const agent = await h.seedAgent(over);
  return updateAgent(h.db, agent.id, { status: "built", systemPrompt: "Bạn là Sen" });
}

function catchError(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (e: unknown) => e,
  );
}

describe("chat.send", () => {
  it("trả reply cho câu hỏi", async () => {
    const agent = await seedBuiltAgent();
    const out = await h.caller().chat.send({
      slug: agent.slug,
      message: "Giá massage bao nhiêu?",
      history: [],
    });
    expect(out.reply.length).toBeGreaterThan(0);
  });

  /**
   * Link demo chia sẻ ngay sau Bước 1 trỏ tới agent status "draft" — chưa có
   * system prompt. Không có chốt này thì `withSessionRecovery` gọi restore với
   * `system_prompt: ""` và bot trả lời như một agent rỗng, không ai biết tại sao.
   * Trang demo có che ô chat lại, nhưng đó là phép lịch sự; đây là thủ tục.
   */
  it("agent chưa dựng thì từ chối bằng BAD_REQUEST, không gọi backend", async () => {
    const agent = await h.seedAgent();
    const chat = vi.fn();
    const restore = vi.fn();

    const err = await catchError(
      h
        .caller({ source: h.source({ chat, restore }) })
        .chat.send({ slug: agent.slug, message: "Giá bao nhiêu?", history: [] }),
    );

    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("BAD_REQUEST");
    expect((err as TRPCError).message).toMatch(/chưa dựng xong/i);
    expect(chat).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
  });

  it("agent mới dựng, chưa kiểm định, vẫn chat được", async () => {
    const agent = await h.seedAgent();
    const api = h.caller();
    await api.agent.setProduct({ slug: agent.slug, product: "chat" });
    await api.agent.build({ slug: agent.slug });

    const out = await api.chat.send({ slug: agent.slug, message: "Giá bao nhiêu?", history: [] });
    expect(out.reply.length).toBeGreaterThan(0);
  });

  it("chuyển history của client xuống backend, không tự bỏ đi", async () => {
    const agent = await seedBuiltAgent();
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
    const agent = await seedBuiltAgent();
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
    const agent = await seedBuiltAgent();
    await expect(
      h.caller().chat.send({ slug: agent.slug, message: "   ", history: [] }),
    ).rejects.toThrow();
  });

  it("slug không tồn tại thì NOT_FOUND", async () => {
    await expect(
      h.caller().chat.send({ slug: "khongcogi12", message: "hi", history: [] }),
    ).rejects.toThrow(/NOT_FOUND|không tìm/i);
  });

  // Agent dựng bằng kịch bản mẫu phải chat được bằng chính kịch bản đó, kể cả khi
  // backend chết. Phân biệt nguồn: row nói "bepnha", ctx là senspa với `chat` là
  // spy — spy được gọi nghĩa là code đang đọc ctx.source thay vì row.
  it("agent mode fixture chat bằng fixture của row, không gọi nguồn live trong ctx", async () => {
    const agent = await seedBuiltAgent({
      sourceUrl: "https://bepnha.vn",
      mode: "fixture",
      fixtureKey: "bepnha",
    });
    const ctxChat = vi.fn().mockResolvedValue({ reply: "reply từ nguồn live" });

    const out = await h.caller({ source: h.source({ chat: ctxChat }) }).chat.send({
      slug: agent.slug,
      message: "Nhà hàng mở cửa mấy giờ?",
      history: [],
    });

    expect(ctxChat).not.toHaveBeenCalled();
    expect(out.reply).toBe("Dạ Bếp Nhà mở 10h00 đến 22h00 hằng ngày ạ.");
  });
});
