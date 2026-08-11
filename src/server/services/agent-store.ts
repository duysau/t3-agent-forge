import { asc, eq } from "drizzle-orm";
import {
  createAgent,
  getAgentById,
  getAgentBySlug,
  updateAgent,
} from "~/server/db/queries/agents";
import { crawledPages, kbChunks } from "~/server/db/schema";
import type { AgentRow, CrawledPageRow, Db, KbChunkRow } from "~/server/db/types";
import type { BuildResult, CrawlResult } from "~/server/agentforge/schemas";
import type { FixtureKey } from "~/lib/fixtures";

export interface PersistCrawlInput {
  sourceUrl: string;
  mode: "live" | "fixture";
  fixtureKey?: FixtureKey;
  degraded?: boolean;
  crawl: CrawlResult;
}

export interface AgentAggregate {
  agent: AgentRow;
  pages: CrawledPageRow[];
  chunks: KbChunkRow[];
}

export async function persistCrawl(db: Db, input: PersistCrawlInput): Promise<AgentRow> {
  return db.transaction(async (tx) => {
    const created = await createAgent(tx, {
      sourceUrl: input.sourceUrl,
      pythonSessionId: input.crawl.sessionId,
      mode: input.mode,
      fixtureKey: input.fixtureKey,
    });

    if (input.crawl.pages.length > 0) {
      await tx.insert(crawledPages).values(
        input.crawl.pages.map((p, i) => ({
          agentId: created.id,
          url: p.url,
          title: p.title,
          status: p.status,
          ord: i,
        })),
      );
    }

    if (input.crawl.chunks.length > 0) {
      await tx.insert(kbChunks).values(
        input.crawl.chunks.map((content, i) => ({
          agentId: created.id,
          content,
          source: "web" as const,
          sourceUrl: input.sourceUrl,
          ord: i,
        })),
      );
    }

    return updateAgent(tx, created.id, {
      kbFacts: input.crawl.kbFacts,
      degraded: input.degraded ?? false,
    });
  });
}

/**
 * Thay thế toàn bộ chunks của agent. Bản chụp KB là ảnh của cả collection
 * Chroma, nên chèn thêm sẽ nhân bản phần web — luôn phải thay thế.
 */
export async function replaceKbChunks(
  db: Db,
  agentId: string,
  chunks: Array<{ content: string; source: "web" | "pdf"; sourceUrl: string | null }>,
): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.delete(kbChunks).where(eq(kbChunks.agentId, agentId));
    if (chunks.length === 0) return 0;
    await tx.insert(kbChunks).values(
      chunks.map((c, i) => ({
        agentId,
        content: c.content,
        source: c.source,
        sourceUrl: c.sourceUrl,
        ord: i,
      })),
    );
    return chunks.length;
  });
}

async function loadChildren(db: Db, agent: AgentRow): Promise<AgentAggregate> {
  const [pages, chunks] = await Promise.all([
    db
      .select()
      .from(crawledPages)
      .where(eq(crawledPages.agentId, agent.id))
      .orderBy(asc(crawledPages.ord)),
    db
      .select()
      .from(kbChunks)
      .where(eq(kbChunks.agentId, agent.id))
      .orderBy(asc(kbChunks.ord)),
  ]);
  return { agent, pages, chunks };
}

export async function getAgentAggregate(
  db: Db,
  slug: string,
): Promise<AgentAggregate | undefined> {
  const agent = await getAgentBySlug(db, slug);
  if (!agent) return undefined;
  return loadChildren(db, agent);
}

export async function getAgentAggregateById(
  db: Db,
  agentId: string,
): Promise<AgentAggregate | undefined> {
  const agent = await getAgentById(db, agentId);
  if (!agent) return undefined;
  return loadChildren(db, agent);
}

/**
 * Ghi artifacts của `/api/build` xuống DB. Brand từ build ghi đè brand lấy lúc
 * crawl, vì build gọi lại `branding.extract_brand()` với KB đầy đủ nên kết quả
 * tốt hơn. **Không** chạm `degraded` hay `fixtureKey`: hai field đó ghi lại việc
 * đã xảy ra ở bước crawl, build không có quyền viết lại lịch sử đó.
 */
export async function saveBuildArtifacts(
  db: Db,
  agentId: string,
  build: BuildResult,
): Promise<AgentRow> {
  return updateAgent(db, agentId, {
    persona: build.persona,
    systemPrompt: build.systemPrompt,
    guardrails: build.guardrails,
    brandName: build.brand.name,
    brandColor: build.brand.color,
    brandLogoLetter: build.brand.logoLetter,
    brandLogoEmoji: build.brand.logo,
    industry: build.industry,
    status: "built",
  });
}
