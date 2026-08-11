import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { persistCrawl } from "~/server/services/agent-store";
import { CRAWL_FIXTURE, makeHarness, type Harness } from "~/test/harness";

const GENERIC_ERROR_MESSAGE = "Hệ thống gặp lỗi không mong muốn. Vui lòng thử lại.";

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
