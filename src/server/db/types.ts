import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

export type Db = PgDatabase<never, typeof schema>;
export type AgentRow = typeof schema.agents.$inferSelect;
export type NewAgentRow = typeof schema.agents.$inferInsert;
export type KbChunkRow = typeof schema.kbChunks.$inferSelect;
export type CrawledPageRow = typeof schema.crawledPages.$inferSelect;
