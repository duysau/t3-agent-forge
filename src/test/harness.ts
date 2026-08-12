import { createCallerFactory } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { createFixtureSource } from "~/server/agentforge/fixture-source";
import { persistCrawl, type PersistCrawlInput } from "~/server/services/agent-store";
import { makeTestDb } from "~/test/db";
import type { AgentForgeSource } from "~/server/agentforge/source";
import type { CrawlResult } from "~/server/agentforge/schemas";
import type { AgentRow, Db } from "~/server/db/types";

const createCaller = createCallerFactory(appRouter);

export type Caller = ReturnType<typeof createCaller>;

/** Kết quả crawl dùng chung cho mọi test router. Đủ để có pages, facts và 2 chunk. */
export const CRAWL_FIXTURE: CrawlResult = {
  sessionId: "sid",
  pages: [{ url: "https://senspa.vn", title: "Sen Spa", status: "ok" }],
  kbFacts: ["Massage body 60 phút: 350.000đ"],
  factsSource: "llm",
  chunks: ["chunk A", "chunk B"],
  totalChunks: 2,
};

export interface Harness {
  db: Db;
  close: () => Promise<void>;
  /** Fixture source delay 0, ghi đè được từng method để dựng kịch bản lỗi. */
  source: (over?: Partial<AgentForgeSource>) => AgentForgeSource;
  /** Caller tRPC gắn vào db của harness. */
  caller: (opts?: { source?: AgentForgeSource; fallbackEnabled?: boolean }) => Caller;
  /** Ghi một agent đã crawl xong vào db, trả về row. */
  seedAgent: (over?: Partial<PersistCrawlInput>) => Promise<AgentRow>;
}

export async function makeHarness(): Promise<Harness> {
  const { db, close } = await makeTestDb();

  const source = (over: Partial<AgentForgeSource> = {}): AgentForgeSource => ({
    ...createFixtureSource("senspa", { delayMs: 0 }),
    ...over,
  });

  return {
    db,
    close,
    source,
    caller: (opts = {}) =>
      createCaller({
        db,
        source: opts.source ?? source(),
        fallbackEnabled: opts.fallbackEnabled ?? true,
      }),
    seedAgent: (over = {}) =>
      persistCrawl(db, {
        sourceUrl: "https://senspa.vn",
        mode: "live",
        crawl: CRAWL_FIXTURE,
        ...over,
      }),
  };
}
