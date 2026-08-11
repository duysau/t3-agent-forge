import { z } from "zod";

export const BRAND_FALLBACK_COLOR = "#203ADC";

export const healthResponse = z.object({ status: z.string() });

export const sessionResponse = z
  .object({ session_id: z.string() })
  .transform((r) => ({ sessionId: r.session_id }));

export const crawlResponse = z
  .object({
    session_id: z.string(),
    pages: z.array(
      z.object({
        url: z.string(),
        title: z.string().nullish(),
        status: z.string(),
      }),
    ),
    kb_facts: z.array(z.string()),
    chunks: z.array(z.string()),
    total_chunks: z.number().int(),
  })
  .transform((r) => ({
    sessionId: r.session_id,
    pages: r.pages.map((p) => ({ url: p.url, title: p.title ?? null, status: p.status })),
    kbFacts: r.kb_facts,
    chunks: r.chunks,
    totalChunks: r.total_chunks,
  }));

export const brandResponse = z
  .object({
    name: z.string().nullish(),
    logo: z.string().nullish(),
    logo_letter: z.string().nullish(),
    color: z.string().nullish(),
    industry: z.string().nullish(),
  })
  .transform((r) => ({
    name: r.name ?? null,
    logo: r.logo ?? null,
    logoLetter: r.logo_letter ?? null,
    color: r.color ?? BRAND_FALLBACK_COLOR,
    industry: r.industry ?? null,
  }));

const personaSchema = z
  .object({
    name: z.string(),
    role: z.string(),
    description: z.string(),
    avatar_letter: z.string().nullish(),
  })
  .transform((p) => ({
    name: p.name,
    role: p.role,
    description: p.description,
    avatarLetter: p.avatar_letter ?? p.name.slice(0, 1).toUpperCase(),
  }));

export const buildResponse = z
  .object({
    brand: brandResponse,
    persona: personaSchema,
    system_prompt: z.string(),
    guardrails: z.array(z.string()),
    industry: z.string().nullish(),
  })
  .transform((r) => ({
    brand: r.brand,
    persona: r.persona,
    systemPrompt: r.system_prompt,
    guardrails: r.guardrails,
    industry: r.industry ?? null,
  }));

const breakdownEntry = z.object({ pass: z.number().int(), total: z.number().int() });

export const evalResponse = z
  .object({
    summary: z.object({
      pass_rate: z.number(),
      avg_score: z.number(),
      passed: z.number().int(),
      total: z.number().int(),
      breakdown: z.object({
        grounded: breakdownEntry,
        trap: breakdownEntry,
        edge: breakdownEntry,
      }),
    }),
    results: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
        score: z.number(),
        pass: z.boolean(),
        reasoning: z.string().nullish(),
        category: z.enum(["grounded", "trap", "edge"]),
      }),
    ),
  })
  .transform((r) => ({
    summary: {
      passRate: r.summary.pass_rate,
      avgScore: r.summary.avg_score,
      passed: r.summary.passed,
      total: r.summary.total,
      breakdown: r.summary.breakdown,
    },
    results: r.results.map((t) => ({
      question: t.question,
      answer: t.answer,
      score: t.score,
      passed: t.pass,
      reasoning: t.reasoning ?? null,
      category: t.category,
    })),
  }));

export const chatResponse = z.object({ reply: z.string() });

export const documentResponse = z
  .object({
    document_id: z.string(),
    file_name: z.string(),
    chunks: z.number().int(),
    pages: z.number().int(),
  })
  .transform((r) => ({
    documentId: r.document_id,
    fileName: r.file_name,
    chunks: r.chunks,
    pages: r.pages,
  }));

export const kbResponse = z
  .object({
    count: z.number().int(),
    chunks: z.array(
      z.object({
        id: z.string(),
        document: z.string(),
        metadata: z
          .object({
            source: z.string().nullish(),
            source_url: z.string().nullish(),
          })
          .default({}),
      }),
    ),
  })
  .transform((r) => ({
    count: r.count,
    chunks: r.chunks.map((c) => ({
      id: c.id,
      content: c.document,
      source: c.metadata.source === "pdf" ? ("pdf" as const) : ("web" as const),
      sourceUrl: c.metadata.source_url ?? null,
    })),
  }));

export const restoreResponse = z
  .object({ session_id: z.string(), chunks_ingested: z.number().int() })
  .transform((r) => ({ sessionId: r.session_id, chunksIngested: r.chunks_ingested }));

export type CrawlResult = z.output<typeof crawlResponse>;
export type BrandResult = z.output<typeof brandResponse>;
export type BuildResult = z.output<typeof buildResponse>;
export type EvalResult = z.output<typeof evalResponse>;
export type KbSnapshot = z.output<typeof kbResponse>;
export type DocumentResult = z.output<typeof documentResponse>;
export type Persona = BuildResult["persona"];
