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
import type { FixtureKey } from "~/lib/fixtures";
import { env } from "~/env";

const fixtureKeySchema = z.enum(["senspa", "bepnha"]);

interface BrandOutcome {
  data: BrandResult;
  degraded: boolean;
  fixtureKey: FixtureKey | null;
}

/**
 * Brand là thông tin phụ: crawl mất tới 180 giây, không đáng huỷ cả mutation vì
 * trích brand lỗi. Nhưng nuốt lỗi im lặng thì lệch contract của `/api/brand` sẽ
 * không ai thấy — nên mỗi lần nuốt đều để lại dấu ở log kèm `kind`. Đây là chỗ
 * duy nhất trong router được phép nuốt lỗi, và nó có tên để nói rõ điều đó.
 */
async function brandOrDefault(
  source: AgentForgeSource,
  sourceUrl: string,
  sessionId: string,
  fallbackEnabled: boolean,
): Promise<BrandOutcome> {
  try {
    return await withFallback({ source, sourceUrl, enabled: fallbackEnabled }, (s) =>
      s.brand(sessionId),
    );
  } catch (err) {
    logBoundary("brand:degraded", {
      kind: err instanceof AgentForgeError ? err.kind : "unknown",
      detail: err instanceof Error ? err.message : String(err),
      sourceUrl,
    });
    return {
      data: {
        name: null,
        logo: null,
        logoLetter: null,
        color: BRAND_FALLBACK_COLOR,
        industry: null,
      },
      degraded: true,
      fixtureKey: null,
    };
  }
}

export const sourceRouter = createTRPCRouter({
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

      // Brand đi cùng lượt crawl: UI cần nó ngay để hiện brandbar.
      const brand = await brandOrDefault(
        source,
        input.url,
        crawled.data.sessionId,
        ctx.fallbackEnabled,
      );

      const saved = await updateAgent(ctx.db, agent.id, {
        brandName: brand.data.name,
        brandColor: brand.data.color,
        brandLogoLetter: brand.data.logoLetter,
        brandLogoEmoji: brand.data.logo,
        industry: brand.data.industry,
        degraded: crawled.degraded || brand.degraded,
        fixtureKey: agent.fixtureKey ?? brand.fixtureKey,
      });

      return {
        slug: saved.slug,
        sessionId: crawled.data.sessionId,
        pages: crawled.data.pages,
        kbFacts: crawled.data.kbFacts,
        totalChunks: crawled.data.totalChunks,
        degraded: saved.degraded,
        brand: brand.data,
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
