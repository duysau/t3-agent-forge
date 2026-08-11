import { describe, expect, it, vi } from "vitest";
import { createLiveSource, type AgentForgeSource } from "./source";
import type { AgentForgeClient } from "./client";

type ForwardCase = [method: Exclude<keyof AgentForgeSource, "kind">, args: unknown[]];

/**
 * Một trường hợp cho MỖI method mà `createLiveSource` chuyển tiếp. Nếu thiếu
 * một method ở đây, một sabotage như `evaluate: (i) => client.build(i)` vẫn
 * compile và pass toàn bộ test suite trước đó — nó chỉ lộ ra khi có test gọi
 * đúng `source.evaluate` và kiểm `client.evaluate` (không phải `client.build`)
 * được gọi.
 */
const FORWARD_CASES: ForwardCase[] = [
  ["health", []],
  ["crawl", [{ url: "https://senspa.vn", maxPages: 5 }]],
  ["brand", ["sid"]],
  ["build", [{ sessionId: "sid", product: "chat" }]],
  ["evaluate", [{ sessionId: "sid", product: "chat" }]],
  ["chat", [{ sessionId: "sid", message: "hi", history: [] }]],
  ["uploadDocument", [{ sessionId: "sid", file: new File(["x"], "a.pdf") }]],
  ["kbSnapshot", ["sid"]],
  [
    "restore",
    [
      {
        sessionId: "sid",
        systemPrompt: "prompt",
        guardrails: ["g"],
        chunks: ["c"],
        kbFacts: ["f"],
        brand: {},
        persona: {},
        url: "https://senspa.vn",
      },
    ],
  ],
];

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

  it.each(FORWARD_CASES)(
    "chuyển %s xuống client cùng tham số, không đổi",
    async (method, args) => {
      const mockFn = vi.fn().mockResolvedValue({ marker: `${method}-ok` });
      const source = createLiveSource(stubClient({ [method]: mockFn } as Partial<AgentForgeClient>));

      const call = source[method] as (...a: unknown[]) => Promise<unknown>;
      const out = await call(...args);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(...args);
      expect(out).toEqual({ marker: `${method}-ok` });
    },
  );

  it("chuyển crawl xuống client không đổi tham số", async () => {
    const crawl = vi.fn().mockResolvedValue({
      sessionId: "sid",
      pages: [],
      kbFacts: [],
      factsSource: "llm",
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
