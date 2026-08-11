import type { BrandResult, EvalResult, Persona } from "~/server/agentforge/schemas";

export type FixtureKey = "senspa" | "bepnha";

export interface Fixture {
  key: FixtureKey;
  domain: string;
  sourceUrl: string;
  brand: BrandResult;
  persona: Persona;
  systemPrompt: string;
  guardrails: string[];
  kbFacts: string[];
  chunks: string[];
  pages: Array<{ url: string; title: string | null; status: string }>;
  evalResult: EvalResult;
  /** Trả lời sẵn cho chat demo offline; chọn theo từ khoá trong câu hỏi. */
  scriptedReplies: Array<{ match: string[]; reply: string }>;
  fallbackReply: string;
}
