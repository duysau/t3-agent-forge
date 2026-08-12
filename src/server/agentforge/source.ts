import type { AgentForgeClient, Product, RestoreInput } from "./client";
import type {
  BrandResult,
  BuildResult,
  CrawlResult,
  DocumentResult,
  EvalResult,
  KbSnapshot,
  VoicePublishResult,
} from "./schemas";

export interface AgentForgeSource {
  readonly kind: "live" | "fixture";
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
  publishVoice(input: { sessionId: string; siteName?: string }): Promise<VoicePublishResult>;
}

export function createLiveSource(client: AgentForgeClient): AgentForgeSource {
  return {
    kind: "live",
    health: () => client.health(),
    crawl: (i) => client.crawl(i),
    brand: (sid) => client.brand(sid),
    build: (i) => client.build(i),
    evaluate: (i) => client.evaluate(i),
    chat: (i) => client.chat(i),
    uploadDocument: (i) => client.uploadDocument(i),
    kbSnapshot: (sid) => client.kbSnapshot(sid),
    restore: (i) => client.restore(i),
    publishVoice: (i) => client.publishVoice(i),
  };
}
