import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { makeTestDb } from "~/test/db";
import type { Db } from "~/server/db/types";
import { createCallerFactory } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { createFixtureSource } from "~/server/agentforge/fixture-source";
import { AgentForgeError } from "~/server/agentforge/errors";
import { BRAND_FALLBACK_COLOR } from "~/server/agentforge/schemas";
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

  it("brand lỗi trong khi crawl thành công thật thì KHÔNG được lộ danh tính doanh nghiệp khác (Finding 3)", async () => {
    // Trước đây `brandOrDefault` bọc `withFallback`, nên brand lỗi trên một
    // crawl thật (ví dụ crawl kfc.vn) sẽ tụt hạng sang brand của MỘT DOANH
    // NGHIỆP KHÁC (fixture senspa: "Sen Spa", 🌸) và bịa `degraded: true` dù
    // pages/chunks vẫn thật 100%. Bài test này khoá lại: brand lỗi chỉ được
    // trả về default trung lập, không đụng tới degraded/fixtureKey của crawl.
    const source: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      brand: vi.fn().mockRejectedValue(new AgentForgeError("upstream", "brand API chết", 502)),
    };
    const api = caller(source);

    const out = await api.source.crawl({ url: "https://kfc.vn", mode: "live" });

    expect(out.degraded).toBe(false);
    expect(out.brand.name).toBeNull();
    expect(out.brand.color).toBe(BRAND_FALLBACK_COLOR);

    const saved = await api.source.bySlug({ slug: out.slug });
    expect(saved.degraded).toBe(false);
    expect(saved.fixtureKey).toBeNull();
    expect(saved.brandName).toBeNull();
    expect(saved.brandColor).toBe(BRAND_FALLBACK_COLOR);
    // Pages/chunks của crawl thật (5 trang senspa fixture đứng thế cho "thật")
    // phải còn nguyên — brand lỗi không được xoá hay tụt hạng chúng.
    expect(saved.pages.length).toBe(5);
    expect(saved.chunkCount).toBeGreaterThan(0);
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

  it("lỗi upstream map đúng sang code BAD_GATEWAY", async () => {
    const bad: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      crawl: vi.fn().mockRejectedValue(new AgentForgeError("upstream", "Cloudflare chặn", 502)),
    };

    // fallbackEnabled = false: kind "upstream" thuộc FALLBACK_KINDS, nếu bật
    // fallback thì lỗi sẽ bị withFallback nuốt và tụt hạng thay vì nổi lên
    // tới trpc error boundary — tắt fallback để ép lỗi thật sự đi qua mapErrors.
    const err: unknown = await caller(bad, false)
      .source.crawl({ url: "https://x.vn", mode: "live" })
      .then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("BAD_GATEWAY");
  });

  it("lỗi timeout map đúng sang code TIMEOUT", async () => {
    const bad: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      crawl: vi.fn().mockRejectedValue(new AgentForgeError("timeout", "Backend không phản hồi", null)),
    };

    // Cùng lý do tắt fallback như trên: "timeout" cũng thuộc FALLBACK_KINDS.
    const err: unknown = await caller(bad, false)
      .source.crawl({ url: "https://x.vn", mode: "live" })
      .then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("TIMEOUT");
  });

  it("lỗi bad_request map đúng sang code BAD_REQUEST và giữ nguyên detail", async () => {
    const bad: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      crawl: vi.fn().mockRejectedValue(new AgentForgeError("bad_request", "URL không hợp lệ", 400)),
    };

    const err: unknown = await caller(bad)
      .source.crawl({ url: "https://x.vn", mode: "live" })
      .then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("BAD_REQUEST");
    expect((err as Error).message).toBe("URL không hợp lệ");
  });

  it("kind rơi vào default của mapping (vd contract) thì trả INTERNAL_SERVER_ERROR nhưng giữ detail, không thay bằng message chung", async () => {
    const bad: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      crawl: vi
        .fn()
        .mockRejectedValue(new AgentForgeError("contract", "Backend đổi hình dạng response", null)),
    };

    const err: unknown = await caller(bad)
      .source.crawl({ url: "https://x.vn", mode: "live" })
      .then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    // "contract" nghĩa là backend đổi hình dạng response — detail này phải tới
    // được developer, không được thay bằng GENERIC_ERROR_MESSAGE như lỗi lạ.
    expect((err as Error).message).toBe("Backend đổi hình dạng response");
    expect((err as Error).message).not.toBe(GENERIC_ERROR_MESSAGE);
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
