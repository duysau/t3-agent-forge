import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { makeTestDb } from "~/test/db";
import type { Db } from "~/server/db/types";
import { documents } from "~/server/db/schema";
import { createFixtureSource } from "~/server/agentforge/fixture-source";
import { AgentForgeError } from "~/server/agentforge/errors";
import type { AgentForgeSource } from "~/server/agentforge/source";
import { getAgentAggregate, persistCrawl } from "./agent-store";
import { IngestRejection, ingestDocument } from "./document-upload";

let db: Db;
let close: () => Promise<void>;

const CRAWL = {
  sessionId: "sid",
  pages: [{ url: "https://senspa.vn", title: "Sen Spa", status: "ok" }],
  kbFacts: ["fact"],
  chunks: ["web 1", "web 2"],
  totalChunks: 2,
};

function pdf(name = "bang-gia.pdf"): File {
  return new File([new Uint8Array([37, 80, 68, 70])], name, { type: "application/pdf" });
}

async function seed() {
  return persistCrawl(db, { sourceUrl: "https://senspa.vn", mode: "live", crawl: CRAWL });
}

beforeEach(async () => {
  ({ db, close } = await makeTestDb());
});
afterEach(async () => {
  await close();
});

describe("ingestDocument", () => {
  it("upload xong thì thay KB bằng bản chụp có cả web và pdf", async () => {
    const agent = await seed();
    const source: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      uploadDocument: vi
        .fn()
        .mockResolvedValue({ documentId: "d1", fileName: "bang-gia.pdf", chunks: 3, pages: 2 }),
      kbSnapshot: vi.fn().mockResolvedValue({
        count: 3,
        chunks: [
          { id: "1", content: "web 1", source: "web", sourceUrl: "https://senspa.vn" },
          { id: "2", content: "web 2", source: "web", sourceUrl: "https://senspa.vn" },
          { id: "3", content: "giá massage 350k", source: "pdf", sourceUrl: null },
        ],
      }),
    };

    const out = await ingestDocument(
      { db, source },
      { slug: agent.slug, file: pdf() },
    );

    expect(out.chunks).toBe(3);
    expect(out.pages).toBe(2);
    expect(out.kbChunkCount).toBe(3);

    const agg = await getAgentAggregate(db, agent.slug);
    expect(agg?.chunks.map((c) => c.source)).toEqual(["web", "web", "pdf"]);
  });

  it("chụp lại là THAY THẾ, không nhân bản phần web", async () => {
    const agent = await seed();
    const source: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      uploadDocument: vi
        .fn()
        .mockResolvedValue({ documentId: "d1", fileName: "a.pdf", chunks: 1, pages: 1 }),
      kbSnapshot: vi.fn().mockResolvedValue({
        count: 2,
        chunks: [
          { id: "1", content: "web 1", source: "web", sourceUrl: null },
          { id: "3", content: "pdf 1", source: "pdf", sourceUrl: null },
        ],
      }),
    };

    await ingestDocument({ db, source }, { slug: agent.slug, file: pdf() });

    const agg = await getAgentAggregate(db, agent.slug);
    expect(agg?.chunks).toHaveLength(2);
  });

  it("ghi bản ghi document để biết đã nạp file nào", async () => {
    const agent = await seed();
    const source: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      uploadDocument: vi
        .fn()
        .mockResolvedValue({ documentId: "abc123", fileName: "menu.pdf", chunks: 5, pages: 3 }),
      kbSnapshot: vi.fn().mockResolvedValue({ count: 0, chunks: [] }),
    };

    const out = await ingestDocument(
      { db, source },
      { slug: agent.slug, file: pdf("menu.pdf") },
    );

    expect(out.fileName).toBe("menu.pdf");

    const rows = await db.select().from(documents).where(eq(documents.agentId, agent.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      agentId: agent.id,
      documentId: "abc123",
      fileName: "menu.pdf",
      chunkCount: 5,
      pageCount: 3,
    });
  });

  it("slug không tồn tại thì ném IngestRejection rõ ràng", async () => {
    const source = createFixtureSource("senspa", { delayMs: 0 });
    await expect(
      ingestDocument({ db, source }, { slug: "khongcogi12", file: pdf() }),
    ).rejects.toThrow(/không tìm thấy agent/i);
    await expect(
      ingestDocument({ db, source }, { slug: "khongcogi12", file: pdf() }),
    ).rejects.toBeInstanceOf(IngestRejection);
  });

  it("agent chưa có session Python thì ném IngestRejection thay vì gọi backend", async () => {
    const agent = await persistCrawl(db, {
      sourceUrl: "https://x.vn",
      mode: "live",
      crawl: { ...CRAWL, sessionId: "" },
    });
    const uploadDocument = vi.fn();
    const source: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      uploadDocument,
    };

    await expect(
      ingestDocument({ db, source }, { slug: agent.slug, file: pdf() }),
    ).rejects.toThrow(/chưa có session/i);
    await expect(
      ingestDocument({ db, source }, { slug: agent.slug, file: pdf() }),
    ).rejects.toBeInstanceOf(IngestRejection);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("agent đang dùng kịch bản mẫu thì từ chối nạp tài liệu bằng IngestRejection, không gọi backend", async () => {
    const agent = await persistCrawl(db, {
      sourceUrl: "https://senspa.vn",
      mode: "fixture",
      fixtureKey: "senspa",
      crawl: CRAWL,
    });
    const uploadDocument = vi.fn();
    const source: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      uploadDocument,
    };

    await expect(
      ingestDocument({ db, source }, { slug: agent.slug, file: pdf() }),
    ).rejects.toThrow(/kịch bản mẫu/i);
    await expect(
      ingestDocument({ db, source }, { slug: agent.slug, file: pdf() }),
    ).rejects.toBeInstanceOf(IngestRejection);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("crawl tụt hạng để lại pythonSessionId dạng fixture- thì từ chối nạp tài liệu thật (Finding 2)", async () => {
    // Mô phỏng đúng hiện trạng `withFallback` tạo ra: mode ghi đúng ý định
    // người dùng ("live") nhưng sessionId là session giả do backend degrade
    // giữa lượt crawl — xem `resolve.ts` withFallback + `agent-store.ts`
    // persistCrawl. Guard `mode === "fixture"` không bắt được trường hợp này.
    const agent = await persistCrawl(db, {
      sourceUrl: "https://senspa.vn",
      mode: "live",
      degraded: true,
      crawl: { ...CRAWL, sessionId: "fixture-senspa" },
    });
    const uploadDocument = vi.fn();
    const source: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      uploadDocument,
    };

    await expect(
      ingestDocument({ db, source }, { slug: agent.slug, file: pdf() }),
    ).rejects.toBeInstanceOf(IngestRejection);
    await expect(
      ingestDocument({ db, source }, { slug: agent.slug, file: pdf() }),
    ).rejects.toThrow(/kịch bản mẫu/i);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("PDF scan bị backend từ chối thì lỗi nổi lên, KB cũ giữ nguyên", async () => {
    const agent = await seed();
    const source: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      uploadDocument: vi
        .fn()
        .mockRejectedValue(new AgentForgeError("bad_request", "PDF không có text", 400)),
    };

    await expect(
      ingestDocument({ db, source }, { slug: agent.slug, file: pdf() }),
    ).rejects.toMatchObject({ kind: "bad_request" });

    const agg = await getAgentAggregate(db, agent.slug);
    expect(agg?.chunks).toHaveLength(2);
    expect(agg?.chunks.map((c) => ({ content: c.content, source: c.source }))).toEqual([
      { content: "web 1", source: "web" },
      { content: "web 2", source: "web" },
    ]);
  });
});
