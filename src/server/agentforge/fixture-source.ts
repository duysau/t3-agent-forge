import { FIXTURES, type FixtureKey } from "~/lib/fixtures";
import type { AgentForgeSource } from "./source";

const DEFAULT_DELAY_MS = 350;

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}

/**
 * Nguồn dữ liệu mẫu chạy offline. Tồn tại cho hai việc: bảo hiểm buổi pitch
 * khi backend hoặc mạng chết, và làm nền cho mọi test không cần backend.
 */
export function createFixtureSource(
  key: FixtureKey,
  opts: { delayMs?: number } = {},
): AgentForgeSource {
  const f = FIXTURES[key];
  const delay = opts.delayMs ?? DEFAULT_DELAY_MS;
  const sessionId = `fixture-${key}`;

  return {
    kind: "fixture",

    async health() {
      return { status: "ok" };
    },

    async crawl() {
      await sleep(delay);
      return {
        sessionId,
        pages: f.pages,
        kbFacts: f.kbFacts,
        // Fixture đại diện một lượt crawl LÀNH: facts do LLM trích. Nếu để null ở đây
        // thì chế độ kịch bản mẫu sẽ không bao giờ khớp nhánh cảnh báo, và ta mất chỗ
        // duy nhất chạy được nhánh "llm" mà không cần backend thật.
        factsSource: "llm",
        chunks: f.chunks,
        totalChunks: f.chunks.length,
      };
    },

    async brand() {
      await sleep(delay);
      return f.brand;
    },

    async build() {
      await sleep(delay);
      return {
        brand: f.brand,
        persona: f.persona,
        systemPrompt: f.systemPrompt,
        guardrails: f.guardrails,
        industry: f.brand.industry,
        // Kịch bản mẫu không chạm nền tảng voice, nên không có lượt publish nào
        // để báo cáo — kể cả khi người dùng chọn product `voice`. Đường publish
        // của chế độ này là `publishVoice()` bên dưới, bấm tay.
        voicePublish: null,
      };
    },

    async evaluate() {
      await sleep(delay);
      return f.evalResult;
    },

    async chat({ message }) {
      await sleep(delay);
      const lower = message.toLowerCase();
      const hit = f.scriptedReplies.find((r) => r.match.some((m) => lower.includes(m)));
      return { reply: hit?.reply ?? f.fallbackReply };
    },

    async uploadDocument({ file }) {
      await sleep(delay);
      return { documentId: `fixture-doc`, fileName: file.name, chunks: 4, pages: 1 };
    },

    async kbSnapshot() {
      await sleep(delay);
      return {
        count: f.chunks.length,
        chunks: f.chunks.map((content, i) => ({
          id: `fixture-${key}-${i}`,
          content,
          source: "web" as const,
          sourceUrl: f.pages[Math.min(i, f.pages.length - 1)]?.url ?? f.sourceUrl,
        })),
      };
    },

    async restore() {
      await sleep(delay);
      return { sessionId, chunksIngested: f.chunks.length };
    },

    /**
     * Kịch bản mẫu chạy offline nên KHÔNG có gì được đẩy lên nền tảng thật —
     * `agentId` để null đúng vì thế: không có agent voice nào bị ghi đè. Trả về
     * một kết quả thành công thay vì throw, để bấm nút publish ở chế độ kịch
     * bản mẫu không dựng một đường lỗi không tồn tại trên sân khấu.
     */
    async publishVoice({ siteName }) {
      await sleep(delay);
      return {
        sessionId,
        siteName: siteName ?? f.brand.name,
        facts: f.kbFacts.length,
        knowledgeId: `fixture-kb-${key}`,
        agentId: null,
        message: "Kịch bản mẫu: KB không được đẩy lên nền tảng voice",
      };
    },
  };
}
