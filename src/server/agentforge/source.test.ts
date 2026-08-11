import { describe, expect, it, vi } from "vitest";
import { createLiveSource } from "./source";
import type { AgentForgeClient } from "./client";

function stubClient(overrides: Partial<AgentForgeClient> = {}): AgentForgeClient {
  return {
    createSession: vi.fn(),
    crawl: vi.fn(),
    brand: vi.fn(),
    build: vi.fn(),
    evaluate: vi.fn(),
    chat: vi.fn(),
    uploadDocument: vi.fn(),
    kbSnapshot: vi.fn(),
    restore: vi.fn(),
    ...overrides,
  } as AgentForgeClient;
}

describe("createLiveSource", () => {
  it("tự nhận kind live", () => {
    expect(createLiveSource(stubClient()).kind).toBe("live");
  });

  it("chuyển crawl xuống client không đổi tham số", async () => {
    const crawl = vi.fn().mockResolvedValue({
      sessionId: "sid",
      pages: [],
      kbFacts: [],
      chunks: [],
      totalChunks: 0,
    });
    const source = createLiveSource(stubClient({ crawl }));

    await source.crawl({ url: "https://senspa.vn", maxPages: 5 });

    expect(crawl).toHaveBeenCalledWith({ url: "https://senspa.vn", maxPages: 5 });
  });

  it("chuyển chat xuống client", async () => {
    const chat = vi.fn().mockResolvedValue({ reply: "ok" });
    const source = createLiveSource(stubClient({ chat }));

    const out = await source.chat({ sessionId: "sid", message: "hi", history: [] });

    expect(chat).toHaveBeenCalledWith({ sessionId: "sid", message: "hi", history: [] });
    expect(out.reply).toBe("ok");
  });

  it("để lỗi từ client nổi lên nguyên vẹn", async () => {
    const boom = new Error("upstream");
    const source = createLiveSource(stubClient({ build: vi.fn().mockRejectedValue(boom) }));

    await expect(source.build({ sessionId: "sid", product: "chat" })).rejects.toBe(boom);
  });
});
