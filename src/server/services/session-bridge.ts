import { updateAgent } from "~/server/db/queries/agents";
import { AgentForgeError, isSessionMissing } from "~/server/agentforge/errors";
import { logBoundary } from "~/server/agentforge/log";
import type { AgentForgeSource } from "~/server/agentforge/source";
import type { Db } from "~/server/db/types";
import { getAgentAggregateById } from "./agent-store";

export interface SessionDeps {
  db: Db;
  source: AgentForgeSource;
}

/**
 * Chạy `fn` với session Python của agent, hồi sinh session nếu nó đã chết.
 *
 * Session backend sống trong một dict in-memory và mất khi restart, nhưng
 * ChromaDB thì persistent và chunk ID là MD5 nội dung — nên nạp lại là
 * **idempotent**, gọi restore nhiều lần không nhân bản KB.
 *
 * Không có endpoint nào để hỏi "session còn sống không", nên ta không probe:
 * cứ thử, và chỉ hồi sinh khi backend trả 404. Thử lại **đúng một lần** — lỗi
 * lần hai là lỗi thật, không phải session chết.
 *
 * Chỗ này phải nằm TRONG procedure, không phải trong middleware tRPC: middleware
 * chỉ thấy lỗi sau khi procedure đã bó tay, và lúc đó không còn cơ hội hồi sinh.
 */
export async function withSessionRecovery<T>(
  deps: SessionDeps,
  agentId: string,
  fn: (sessionId: string) => Promise<T>,
): Promise<T> {
  // Hai lỗi dưới đây là `AgentForgeError` kind `bad_request`, KHÔNG phải `Error`
  // trần. `mapErrors` (trpc.ts) chỉ giữ nguyên message của AgentForgeError và của
  // TRPCError có code cụ thể; một throw không nhận dạng được thành
  // INTERNAL_SERVER_ERROR và message bị thay bằng message chung — đúng đắn cho lỗi
  // lạ, nhưng ở đây nó xoá sổ lời hướng dẫn duy nhất giúp người dùng tự thoát.
  const agg = await getAgentAggregateById(deps.db, agentId);
  if (!agg) {
    throw new AgentForgeError("bad_request", `Không tìm thấy agent ${agentId}`, null);
  }

  const sessionId = agg.agent.pythonSessionId;
  if (!sessionId) {
    throw new AgentForgeError(
      "bad_request",
      "Agent chưa có session Python — hãy crawl lại trước khi tiếp tục",
      null,
    );
  }

  try {
    return await fn(sessionId);
  } catch (err) {
    if (!isSessionMissing(err)) throw err;

    logBoundary("session:restore", { agentId, deadSessionId: sessionId });

    const restored = await deps.source.restore({
      sessionId,
      systemPrompt: agg.agent.systemPrompt ?? "",
      guardrails: (agg.agent.guardrails as string[] | null) ?? [],
      chunks: agg.chunks.map((c) => c.content),
      kbFacts: (agg.agent.kbFacts as string[] | null) ?? [],
      brand: {
        name: agg.agent.brandName,
        logo_letter: agg.agent.brandLogoLetter,
        color: agg.agent.brandColor,
        industry: agg.agent.industry,
      },
      persona: (agg.agent.persona as Record<string, unknown> | null) ?? {},
      url: agg.agent.sourceUrl,
    });

    await updateAgent(deps.db, agentId, { pythonSessionId: restored.sessionId });

    return await fn(restored.sessionId);
  }
}
