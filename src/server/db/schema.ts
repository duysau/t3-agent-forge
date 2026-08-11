import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTableCreator,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `agentforge_${name}`);

// LEGACY (scaffold example): kept only so the example `post` router/component
// still type-checks. Task 11 removes the `post` router and this table together.
// See task-3-report.md for the rationale (Task 3, ambiguity #3).
export const posts = createTable(
  "post",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: varchar("name", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [index("name_idx").on(t.name)],
);

export const agents = createTable(
  "agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 12 }).notNull().unique(),
    pythonSessionId: varchar("python_session_id", { length: 32 }),
    sourceUrl: text("source_url").notNull(),
    mode: varchar("mode", { length: 8 }).notNull().default("live"),
    fixtureKey: varchar("fixture_key", { length: 16 }),
    degraded: boolean("degraded").notNull().default(false),
    product: varchar("product", { length: 8 }),
    voiceId: varchar("voice_id", { length: 32 }),
    brandName: text("brand_name"),
    brandColor: varchar("brand_color", { length: 9 }).notNull().default("#203ADC"),
    brandLogoLetter: varchar("brand_logo_letter", { length: 4 }),
    brandLogoEmoji: varchar("brand_logo_emoji", { length: 8 }),
    industry: text("industry"),
    persona: jsonb("persona"),
    systemPrompt: text("system_prompt"),
    guardrails: jsonb("guardrails"),
    kbFacts: jsonb("kb_facts"),
    status: varchar("status", { length: 12 }).notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("agents_slug_idx").on(t.slug)],
);

export const crawledPages = createTable(
  "crawled_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    status: varchar("status", { length: 8 }).notNull(),
    ord: integer("ord").notNull(),
  },
  (t) => [index("crawled_pages_agent_idx").on(t.agentId)],
);

export const kbChunks = createTable(
  "kb_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    sourceUrl: text("source_url"),
    source: varchar("source", { length: 8 }).notNull().default("web"),
    ord: integer("ord").notNull(),
  },
  (t) => [index("kb_chunks_agent_idx").on(t.agentId)],
);

export const documents = createTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  documentId: varchar("document_id", { length: 32 }).notNull(),
  fileName: text("file_name").notNull(),
  chunkCount: integer("chunk_count").notNull(),
  pageCount: integer("page_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evalRuns = createTable("eval_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  passRate: integer("pass_rate").notNull(),
  avgScore: numeric("avg_score", { precision: 3, scale: 2 }).notNull(),
  passed: integer("passed").notNull(),
  total: integer("total").notNull(),
  breakdown: jsonb("breakdown").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evalResults = createTable(
  "eval_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    evalRunId: uuid("eval_run_id")
      .notNull()
      .references(() => evalRuns.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 10 }).notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    score: numeric("score", { precision: 2, scale: 1 }).notNull(),
    passed: boolean("passed").notNull(),
    reasoning: text("reasoning"),
    ord: integer("ord").notNull(),
  },
  (t) => [index("eval_results_run_idx").on(t.evalRunId)],
);

export const voiceScripts = createTable("voice_scripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  turns: jsonb("turns").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
