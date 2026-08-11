import { describe, expect, it, vi } from "vitest";
import { resolveSource, withFallback } from "./resolve";
import { AgentForgeError } from "./errors";
import { createFixtureSource } from "./fixture-source";

const BASE = "http://127.0.0.1:8444";

describe("resolveSource", () => {
  it("mode live cho nguồn live", () => {
    expect(resolveSource({ mode: "live", baseUrl: BASE }).kind).toBe("live");
  });

  it("mode fixture cho nguồn fixture", () => {
    expect(resolveSource({ mode: "fixture", fixtureKey: "bepnha", baseUrl: BASE }).kind).toBe(
      "fixture",
    );
  });
});

describe("withFallback", () => {
  const live = createFixtureSource("senspa", { delayMs: 0 }); // đứng thế cho nguồn live

  it("thành công thì không tụt hạng", async () => {
    const out = await withFallback(
      { source: live, sourceUrl: "https://senspa.vn", enabled: true },
      async (s) => (await s.chat({ sessionId: "x", message: "giá", history: [] })).reply,
    );
    expect(out.degraded).toBe(false);
    expect(out.fixtureKey).toBeNull();
    expect(out.data.length).toBeGreaterThan(0);
  });

  it("lỗi upstream thì tụt hạng sang fixture và báo degraded", async () => {
    const failing = {
      ...live,
      kind: "live" as const,
      chat: vi.fn().mockRejectedValue(new AgentForgeError("upstream", "LLM lỗi", 502)),
    };

    const out = await withFallback(
      { source: failing, sourceUrl: "https://senspa.vn", enabled: true },
      async (s) => (await s.chat({ sessionId: "x", message: "giá", history: [] })).reply,
    );

    expect(out.degraded).toBe(true);
    expect(out.fixtureKey).toBe("senspa");
    expect(out.data).toContain("350.000đ");
  });

  it("chọn fixture theo domain của URL", async () => {
    const failing = {
      ...live,
      kind: "live" as const,
      chat: vi.fn().mockRejectedValue(new AgentForgeError("network", "mất mạng", null)),
    };

    const out = await withFallback(
      { source: failing, sourceUrl: "https://bepnha.vn", enabled: true },
      async (s) => (await s.chat({ sessionId: "x", message: "đặt bàn", history: [] })).reply,
    );

    expect(out.fixtureKey).toBe("bepnha");
  });

  it("KHÔNG tụt hạng với lỗi bad_request — đó là lỗi người dùng, không phải backend chết", async () => {
    const failing = {
      ...live,
      kind: "live" as const,
      chat: vi.fn().mockRejectedValue(new AgentForgeError("bad_request", "thiếu message", 400)),
    };

    await expect(
      withFallback({ source: failing, sourceUrl: "https://senspa.vn", enabled: true }, (s) =>
        s.chat({ sessionId: "x", message: "", history: [] }),
      ),
    ).rejects.toMatchObject({ kind: "bad_request" });
  });

  it("KHÔNG tụt hạng với lỗi contract — phải nhìn thấy backend đã đổi", async () => {
    const failing = {
      ...live,
      kind: "live" as const,
      chat: vi.fn().mockRejectedValue(new AgentForgeError("contract", "thiếu reply", 200)),
    };

    await expect(
      withFallback({ source: failing, sourceUrl: "https://senspa.vn", enabled: true }, (s) =>
        s.chat({ sessionId: "x", message: "hi", history: [] }),
      ),
    ).rejects.toMatchObject({ kind: "contract" });
  });

  it("enabled=false thì để lỗi nổi lên dù lỗi đáng tụt hạng", async () => {
    const failing = {
      ...live,
      kind: "live" as const,
      chat: vi.fn().mockRejectedValue(new AgentForgeError("upstream", "LLM lỗi", 502)),
    };

    await expect(
      withFallback({ source: failing, sourceUrl: "https://senspa.vn", enabled: false }, (s) =>
        s.chat({ sessionId: "x", message: "hi", history: [] }),
      ),
    ).rejects.toMatchObject({ kind: "upstream" });
  });

  it("nguồn đang là fixture thì không tụt hạng lần hai", async () => {
    const failing = {
      ...live,
      chat: vi.fn().mockRejectedValue(new AgentForgeError("upstream", "x", 502)),
    };

    await expect(
      withFallback({ source: failing, sourceUrl: "https://senspa.vn", enabled: true }, (s) =>
        s.chat({ sessionId: "x", message: "hi", history: [] }),
      ),
    ).rejects.toMatchObject({ kind: "upstream" });
  });
});
