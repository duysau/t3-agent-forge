import {
  brandResponse,
  buildResponse,
  chatResponse,
  crawlResponse,
  documentResponse,
  evalResponse,
  healthResponse,
  kbResponse,
  restoreResponse,
  sessionResponse,
  type BrandResult,
  type BuildResult,
  type CrawlResult,
  type DocumentResult,
  type EvalResult,
  type KbSnapshot,
  type RestoreBrand,
  type RestorePersona,
} from "./schemas";
import { AgentForgeError, extractDetail, kindFromStatus } from "./errors";
import { logBoundary } from "./log";
import type { ZodType, ZodTypeDef } from "zod";

export const KB_SNAPSHOT_LIMIT = 1000;

/** Lấy từ `endpoint.md`, cột "Timeout gợi ý". Đơn vị: ms. */
export const TIMEOUTS = {
  health: 5_000,
  sessions: 5_000,
  restore: 30_000,
  crawl: 180_000,
  documents: 30_000,
  brand: 10_000,
  build: 60_000,
  eval: 300_000,
  chat: 30_000,
  kb: 10_000,
} as const;

export type Product = "chat" | "voice";

export interface RestoreInput {
  sessionId: string;
  systemPrompt: string;
  guardrails: string[];
  chunks: string[];
  kbFacts: string[];
  // Kiểu thật, không `Record<string, unknown>`: hai field này đi thẳng vào body
  // JSON nên chúng PHẢI ở wire shape snake_case. Khi còn là Record, một persona
  // camelCase lọt qua compile và chỉ hỏng lúc chạy, ở chỗ không ai nhìn.
  brand: RestoreBrand;
  persona: RestorePersona | null;
  url: string;
}

interface RequestOptions<T> {
  path: string;
  method?: "GET" | "POST";
  json?: unknown;
  form?: FormData;
  timeoutMs: number;
  schema: ZodType<T, ZodTypeDef, any>;
  label: string;
}

export interface AgentForgeClient {
  createSession(): Promise<{ sessionId: string }>;
  health(): Promise<{ status: string }>;
  crawl(input: { url: string; maxPages: number }): Promise<CrawlResult>;
  brand(sessionId: string): Promise<BrandResult>;
  build(input: { sessionId: string; product: Product }): Promise<BuildResult>;
  evaluate(input: { sessionId: string; product: Product }): Promise<EvalResult>;
  chat(input: {
    sessionId: string;
    message: string;
    history: Array<{ role: string; content: string }>;
  }): Promise<{ reply: string }>;
  uploadDocument(input: { sessionId: string; file: File }): Promise<DocumentResult>;
  kbSnapshot(sessionId: string): Promise<KbSnapshot>;
  restore(input: RestoreInput): Promise<{ sessionId: string; chunksIngested: number }>;
}

export function createClient(opts: {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): AgentForgeClient {
  const baseUrl = opts.baseUrl.replace(/\/$/, "");
  const doFetch = opts.fetchImpl ?? fetch;

  async function request<T>(o: RequestOptions<T>): Promise<T> {
    const url = `${baseUrl}${o.path}`;
    const started = Date.now();
    let res: Response;

    try {
      res = await doFetch(url, {
        method: o.method ?? "GET",
        headers: o.json ? { "content-type": "application/json" } : undefined,
        body: o.form ?? (o.json ? JSON.stringify(o.json) : undefined),
        signal: AbortSignal.timeout(o.timeoutMs),
      });
    } catch (err) {
      const aborted = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
      const kind = aborted ? "timeout" : "network";
      logBoundary(`${o.label}:error`, { kind, url, ms: Date.now() - started });
      throw new AgentForgeError(kind, aborted ? `Quá thời gian chờ ${o.timeoutMs}ms` : "Không kết nối được backend", null);
    }

    const text = await res.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }

    if (!res.ok) {
      const detail = extractDetail(payload, res.status);
      const kind = kindFromStatus(res.status);
      logBoundary(`${o.label}:error`, { kind, status: res.status, detail, ms: Date.now() - started });
      throw new AgentForgeError(kind, detail, res.status);
    }

    const parsed = o.schema.safeParse(payload);
    if (!parsed.success) {
      logBoundary(`${o.label}:contract`, {
        url,
        issues: parsed.error.issues,
        raw: payload,
      });
      throw new AgentForgeError(
        "contract",
        `Response không đúng contract: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`,
        res.status,
        payload,
      );
    }

    logBoundary(`${o.label}:ok`, { ms: Date.now() - started });
    return parsed.data;
  }

  return {
    createSession: () =>
      request({
        path: "/api/sessions",
        method: "POST",
        timeoutMs: TIMEOUTS.sessions,
        schema: sessionResponse,
        label: "sessions",
      }),

    health: () =>
      request({
        path: "/api/health",
        timeoutMs: TIMEOUTS.health,
        schema: healthResponse,
        label: "health",
      }),

    crawl: ({ url, maxPages }) =>
      request({
        path: "/api/crawl",
        method: "POST",
        json: { url, max_pages: maxPages },
        timeoutMs: TIMEOUTS.crawl,
        schema: crawlResponse,
        label: "crawl",
      }),

    brand: (sessionId) =>
      request({
        path: `/api/brand/${encodeURIComponent(sessionId)}`,
        timeoutMs: TIMEOUTS.brand,
        schema: brandResponse,
        label: "brand",
      }),

    build: ({ sessionId, product }) =>
      request({
        path: "/api/build",
        method: "POST",
        json: { session_id: sessionId, product },
        timeoutMs: TIMEOUTS.build,
        schema: buildResponse,
        label: "build",
      }),

    evaluate: ({ sessionId, product }) =>
      request({
        path: "/api/eval",
        method: "POST",
        json: { session_id: sessionId, product },
        timeoutMs: TIMEOUTS.eval,
        schema: evalResponse,
        label: "eval",
      }),

    chat: ({ sessionId, message, history }) =>
      request({
        path: "/api/chat",
        method: "POST",
        json: { session_id: sessionId, message, history },
        timeoutMs: TIMEOUTS.chat,
        schema: chatResponse,
        label: "chat",
      }),

    uploadDocument: ({ sessionId, file }) => {
      const form = new FormData();
      form.set("session_id", sessionId);
      form.set("file", file);
      return request({
        path: "/api/documents",
        method: "POST",
        form,
        timeoutMs: TIMEOUTS.documents,
        schema: documentResponse,
        label: "documents",
      });
    },

    kbSnapshot: (sessionId) =>
      request({
        path: `/api/kb?session_id=${encodeURIComponent(sessionId)}&limit=${KB_SNAPSHOT_LIMIT}`,
        timeoutMs: TIMEOUTS.kb,
        schema: kbResponse,
        label: "kb",
      }),

    restore: (input) =>
      request({
        path: "/api/sessions/restore",
        method: "POST",
        json: {
          session_id: input.sessionId,
          system_prompt: input.systemPrompt,
          guardrails: input.guardrails,
          chunks: input.chunks,
          kb_facts: input.kbFacts,
          brand: input.brand,
          persona: input.persona,
          url: input.url,
        },
        timeoutMs: TIMEOUTS.restore,
        schema: restoreResponse,
        label: "restore",
      }),
  };
}
