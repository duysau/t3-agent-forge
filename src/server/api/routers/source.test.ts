import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { makeTestDb } from "~/test/db";
import type { Db } from "~/server/db/types";
import { createCallerFactory } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { createFixtureSource } from "~/server/agentforge/fixture-source";
import { AgentForgeError } from "~/server/agentforge/errors";
import type { AgentForgeSource } from "~/server/agentforge/source";

const GENERIC_ERROR_MESSAGE = "Hệ thống gặp lỗi không mong muốn. Vui lòng thử lại.";

let db: Db;
let close: () => Promise<void>;

function caller(source: AgentForgeSource, fallbackEnabled = true) {
  return createCallerFactory(appRouter)({ db, source, fallbackEnabled });
}

beforeEach(async () => {
  ({ db, close } = await makeTestDb());
});
afterEach(async () => {
  await close();
});

describe("source.crawl", () => {
  it("crawl xong trả slug và ghi đủ dữ liệu xuống DB", async () => {
    const api = caller(createFixtureSource("senspa", { delayMs: 0 }));

    const out = await api.source.crawl({ url: "https://senspa.vn", mode: "live" });

    expect(out.slug).toHaveLength(12);
    expect(out.kbFacts.length).toBeGreaterThan(0);
    expect(out.pages.length).toBe(5);
    expect(out.degraded).toBe(false);

    const saved = await api.source.bySlug({ slug: out.slug });
    expect(saved.chunkCount).toBe(out.totalChunks);
    expect(saved.status).toBe("draft");
  });

  it("trả brand cùng lượt crawl để UI không phải gọi thêm", async () => {
    const api = caller(createFixtureSource("senspa", { delayMs: 0 }));
    const out = await api.source.crawl({ url: "https://senspa.vn", mode: "live" });
    expect(out.brand.name).toBe("Sen Spa");
    expect(out.brand.color).toBe("#203ADC");
  });

  it("mode fixture ghi fixtureKey", async () => {
    const api = caller(createFixtureSource("bepnha", { delayMs: 0 }));
    const out = await api.source.crawl({
      url: "https://bepnha.vn",
      mode: "fixture",
      fixtureKey: "bepnha",
    });
    const saved = await api.source.bySlug({ slug: out.slug });
    expect(saved.mode).toBe("fixture");
    expect(saved.fixtureKey).toBe("bepnha");
    expect(saved.brandName).toBe("Bếp Nhà");
  });

  it("backend chết thì tụt hạng, lưu dữ liệu mẫu và đánh dấu degraded", async () => {
    const dead: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      crawl: vi.fn().mockRejectedValue(new AgentForgeError("upstream", "Cloudflare chặn", 502)),
      brand: vi.fn().mockRejectedValue(new AgentForgeError("upstream", "chết", 502)),
    };
    const api = caller(dead);

    const out = await api.source.crawl({ url: "https://senspa.vn", mode: "live" });

    expect(out.degraded).toBe(true);
    const saved = await api.source.bySlug({ slug: out.slug });
    expect(saved.degraded).toBe(true);
    expect(saved.chunkCount).toBeGreaterThan(0);
  });

  it("lỗi bad_request nổi lên tới client, không bị che", async () => {
    const bad: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      crawl: vi.fn().mockRejectedValue(new AgentForgeError("bad_request", "URL không hợp lệ", 400)),
    };

    await expect(
      caller(bad).source.crawl({ url: "https://x.vn", mode: "live" }),
    ).rejects.toThrow(/URL không hợp lệ/);
  });

  it("từ chối URL không đúng dạng ngay ở input schema", async () => {
    const api = caller(createFixtureSource("senspa", { delayMs: 0 }));

    const err: unknown = await api.source
      .crawl({ url: "khong-phai-url", mode: "live" })
      .then(() => null, (e: unknown) => e);

    // Đọc thẳng code trên TRPCError, không match theo prose: lỗi validation của
    // Zod (input schema) phải giữ đúng BAD_REQUEST, không bị hạ xuống
    // INTERNAL_SERVER_ERROR và message không được thay bằng message chung.
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("BAD_REQUEST");
    expect((err as TRPCError).message).not.toBe(GENERIC_ERROR_MESSAGE);
  });

  it("lỗi hệ thống không xác định (vd driver DB chết) thì che message gốc, chỉ trả message chung", async () => {
    const broken: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      crawl: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5432")),
    };

    const err: unknown = await caller(broken)
      .source.crawl({ url: "https://x.vn", mode: "live" })
      .then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    const message = (err as Error).message;
    expect(message).toBe(GENERIC_ERROR_MESSAGE);
    // Đây là bài test lộ thông tin thật sự quan trọng: message gốc của driver
    // (host, port) tuyệt đối không được lọt tới client.
    expect(message).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|5432/);
  });
});

describe("source.bySlug", () => {
  it("slug không tồn tại thì ném NOT_FOUND", async () => {
    const api = caller(createFixtureSource("senspa", { delayMs: 0 }));
    await expect(api.source.bySlug({ slug: "khongcogi12" })).rejects.toThrow(/NOT_FOUND|không tìm/i);
  });
});
