import { documents } from "~/server/db/schema";
import type { AgentForgeSource } from "~/server/agentforge/source";
import type { Db } from "~/server/db/types";
import { getAgentAggregate, replaceKbChunks } from "./agent-store";

export interface IngestDeps {
  db: Db;
  source: AgentForgeSource;
}

export interface IngestResult {
  fileName: string;
  chunks: number;
  pages: number;
  kbChunkCount: number;
}

/**
 * Nạp PDF vào knowledge base của agent.
 *
 * **Không tụt hạng sang fixture ở đây, có chủ đích.** Bản chụp KB là ảnh của cả
 * collection và `replaceKbChunks` thay thế toàn bộ, nên nếu tụt hạng thì một
 * hiccup của backend sẽ ghi 6 chunk mẫu lên 12 chunk thật vừa crawl được — xoá
 * dữ liệu thật, im lặng, vì một tài liệu bổ sung tuỳ chọn. Thà để lỗi nổi lên:
 * người dùng thử lại được, còn KB cũ thì còn nguyên.
 */
export async function ingestDocument(
  deps: IngestDeps,
  input: { slug: string; file: File },
): Promise<IngestResult> {
  const agg = await getAgentAggregate(deps.db, input.slug);
  if (!agg) throw new Error(`Không tìm thấy agent ${input.slug}`);

  if (agg.agent.mode === "fixture") {
    throw new Error(
      "Agent đang dùng kịch bản mẫu nên không nạp được tài liệu thật — hãy crawl một website thật trước",
    );
  }

  const sessionId = agg.agent.pythonSessionId;
  if (!sessionId) {
    throw new Error("Agent chưa có session Python — hãy crawl trước khi nạp tài liệu");
  }

  const uploaded = await deps.source.uploadDocument({ sessionId, file: input.file });

  await deps.db.insert(documents).values({
    agentId: agg.agent.id,
    documentId: uploaded.documentId,
    fileName: uploaded.fileName,
    chunkCount: uploaded.chunks,
    pageCount: uploaded.pages,
  });

  // `/api/documents` chỉ trả SỐ LƯỢNG chunk, không trả text. Muốn T3 sở hữu KB
  // thì phải chụp lại cả collection rồi thay thế — chèn thêm sẽ nhân bản phần web.
  const snapshot = await deps.source.kbSnapshot(sessionId);

  const kbChunkCount = await replaceKbChunks(
    deps.db,
    agg.agent.id,
    snapshot.chunks.map((c) => ({
      content: c.content,
      source: c.source,
      sourceUrl: c.sourceUrl,
    })),
  );

  return {
    fileName: uploaded.fileName,
    chunks: uploaded.chunks,
    pages: uploaded.pages,
    kbChunkCount,
  };
}
