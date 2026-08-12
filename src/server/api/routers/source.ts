import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { resolveSource, withFallback } from "~/server/agentforge/resolve";
import { AgentForgeError } from "~/server/agentforge/errors";
import { logBoundary } from "~/server/agentforge/log";
import { getAgentAggregate, persistCrawl } from "~/server/services/agent-store";
import { updateAgent } from "~/server/db/queries/agents";
import { BRAND_FALLBACK_COLOR, type BrandResult } from "~/server/agentforge/schemas";
import type { AgentForgeSource } from "~/server/agentforge/source";
import { env } from "~/env";

const fixtureKeySchema = z.enum(["senspa", "bepnha"]);

/**
 * Brand là thông tin phụ: crawl mất tới 180 giây, không đáng huỷ cả mutation vì
 * trích brand lỗi. Nhưng nuốt lỗi im lặng thì lệch contract của `/api/brand` sẽ
 * không ai thấy — nên mỗi lần nuốt đều để lại dấu ở log kèm `kind`. Đây là chỗ
 * duy nhất trong router được phép nuốt lỗi, và nó có tên để nói rõ điều đó.
 *
 * KHÔNG dùng `withFallback` ở đây (đã từng dùng, đó là bug): brand luôn có sẵn
 * một fallback TRUNG LẬP — tên null, `BRAND_FALLBACK_COLOR` — nên không cần
 * fixture nào cả. `withFallback` tụt hạng brand sang fixture của MỘT DOANH
 * NGHIỆP KHÁC (ví dụ crawl thật `kfc.vn` nhưng brand lỗi thì nhận "Sen Spa",
 * 🌸, `#203ADC`) và đồng thời báo `degraded: true` dù pages/chunks vẫn là dữ
 * liệu thật — hai lỗi cùng lúc: lộ danh tính sai, và badge tụt hạng bịa đặt.
 * Vì vậy hàm này không còn trả `degraded`/`fixtureKey` — cả hai trường đó chỉ
 * còn ý nghĩa ở kết quả crawl.
 */
async function brandOrDefault(
  source: AgentForgeSource,
  sourceUrl: string,
  sessionId: string,
): Promise<BrandResult> {
  try {
    return await source.brand(sessionId);
  } catch (err) {
    logBoundary("brand:degraded", {
      kind: err instanceof AgentForgeError ? err.kind : "unknown",
      detail: err instanceof Error ? err.message : String(err),
      sourceUrl,
    });
    return {
      name: null,
      logo: null,
      logoLetter: null,
      color: BRAND_FALLBACK_COLOR,
      industry: null,
    };
  }
}

export const sourceRouter = createTRPCRouter({
  /**
   * Không bao giờ throw. Đây là procedure duy nhất mà "backend chết" là một
   * câu trả lời hợp lệ, không phải một lỗi — cả trang phụ thuộc vào nó để
   * quyết định có hiện banner hay không.
   */
  health: publicProcedure.query(async ({ ctx }) => {
    try {
      await ctx.source.health();
      return { backend: "up" as const, reason: null };
    } catch (err) {
      const reason =
        err instanceof AgentForgeError
          ? (err.detail ?? err.message)
          : err instanceof Error
            ? err.message
            : "Lỗi không xác định";
      return { backend: "down" as const, reason };
    }
  }),

  crawl: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        mode: z.enum(["live", "fixture"]),
        fixtureKey: fixtureKeySchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const source =
        input.mode === "fixture"
          ? resolveSource({
              mode: "fixture",
              fixtureKey: input.fixtureKey,
              baseUrl: env.PYTHON_API_URL,
            })
          : ctx.source;

      const crawled = await withFallback(
        { source, sourceUrl: input.url, enabled: ctx.fallbackEnabled },
        (s) => s.crawl({ url: input.url, maxPages: env.CRAWL_MAX_PAGES }),
      );

      const agent = await persistCrawl(ctx.db, {
        sourceUrl: input.url,
        mode: input.mode,
        fixtureKey: input.fixtureKey ?? crawled.fixtureKey ?? undefined,
        degraded: crawled.degraded,
        crawl: crawled.data,
      });

      // Brand đi cùng lượt crawl: UI cần nó ngay để hiện brandbar. `degraded`
      // và `fixtureKey` của agent chỉ phản ánh kết quả CRAWL — brand thất bại
      // không được đổi cả hai, xem `brandOrDefault`.
      const brand = await brandOrDefault(source, input.url, crawled.data.sessionId);

      const saved = await updateAgent(ctx.db, agent.id, {
        brandName: brand.name,
        brandColor: brand.color,
        brandLogoLetter: brand.logoLetter,
        brandLogoEmoji: brand.logo,
        industry: brand.industry,
        degraded: crawled.degraded,
        fixtureKey: agent.fixtureKey,
      });

      return {
        slug: saved.slug,
        sessionId: crawled.data.sessionId,
        pages: crawled.data.pages,
        kbFacts: crawled.data.kbFacts,
        // Tín hiệu chất lượng facts, chỉ để hiển thị — KHÔNG lưu DB. Nghĩa là cảnh báo
        // chỉ sống trong lượt crawl này: tải lại trang hay quay lại Bước 1 là mất. Đổi
        // lại là không phải migrate schema cho một field tư vấn. Nếu sau này cần cảnh
        // báo bền qua cả Bước 3 (nơi eval thật sự chịu ảnh hưởng) thì phải thêm cột.
        factsSource: crawled.data.factsSource,
        totalChunks: crawled.data.totalChunks,
        degraded: saved.degraded,
        brand,
      };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const agg = await getAgentAggregate(ctx.db, input.slug);
      if (!agg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy agent" });
      }
      return {
        slug: agg.agent.slug,
        sourceUrl: agg.agent.sourceUrl,
        mode: agg.agent.mode as "live" | "fixture",
        fixtureKey: agg.agent.fixtureKey,
        degraded: agg.agent.degraded,
        status: agg.agent.status,
        product: agg.agent.product as "chat" | "voice" | null,
        voiceId: agg.agent.voiceId,
        brandName: agg.agent.brandName,
        brandColor: agg.agent.brandColor,
        brandLogoLetter: agg.agent.brandLogoLetter,
        brandLogoEmoji: agg.agent.brandLogoEmoji,
        industry: agg.agent.industry,
        kbFacts: (agg.agent.kbFacts as string[] | null) ?? [],
        pages: agg.pages.map((p) => ({ url: p.url, title: p.title, status: p.status })),
        chunkCount: agg.chunks.length,
      };
    }),
});
