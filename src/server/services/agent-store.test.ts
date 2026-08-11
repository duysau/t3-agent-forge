import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTableName, type Table } from "drizzle-orm";
import { makeTestDb } from "~/test/db";
import { agents, crawledPages, kbChunks } from "~/server/db/schema";
import type { Db } from "~/server/db/types";
import { getAgentAggregate, persistCrawl, replaceKbChunks } from "./agent-store";

/**
 * Bọc một Db thật bằng Proxy: khi `insert` được gọi (kể cả insert gọi từ
 * trong `db.transaction`) với đúng bảng `table`, ném lỗi để mô phỏng write
 * đó thất bại giữa transaction (ví dụ mất kết nối tạm thời). So khớp theo
 * tên bảng thật (`getTableName`) chứ không đếm số lần gọi, để chỉ đúng một
 * write bị nhắm tới — không lệch theo thứ tự insert bên trong.
 */
function wrapDbFailingOnInsertInto(target: Db, table: Table): Db {
  const targetName = getTableName(table);

  function wrap<T extends object>(obj: T): T {
    return new Proxy(obj, {
      get(o, prop, receiver) {
        if (prop === "insert") {
          return (...args: unknown[]) => {
            const insertedTable = args[0];
            if (insertedTable && getTableName(insertedTable as Table) === targetName) {
              throw new Error(`boom: insert vào ${targetName} thất bại`);
            }
            const original: unknown = Reflect.get(o, prop, receiver);
            return (original as (...a: unknown[]) => unknown).apply(o, args);
          };
        }
        if (prop === "transaction") {
          return (callback: (tx: unknown) => Promise<unknown>, config?: unknown) => {
            const original: unknown = Reflect.get(o, prop, receiver);
            return (
              original as (
                cb: (tx: unknown) => Promise<unknown>,
                cfg?: unknown,
              ) => Promise<unknown>
            ).call(o, (tx: unknown) => callback(wrap(tx as object)), config);
          };
        }
        const value: unknown = Reflect.get(o, prop, receiver);
        return typeof value === "function"
          ? (value as (...a: unknown[]) => unknown).bind(o)
          : value;
      },
    });
  }

  return wrap(target);
}

let db: Db;
let close: () => Promise<void>;

const CRAWL = {
  sessionId: "a73534289394",
  pages: [
    { url: "https://senspa.vn", title: "Sen Spa", status: "ok" },
    { url: "https://senspa.vn/bang-gia", title: "Bảng giá", status: "ok" },
  ],
  kbFacts: ["Massage 60 phút: 350.000đ"],
  chunks: ["chunk A", "chunk B", "chunk C"],
  totalChunks: 3,
};

beforeEach(async () => {
  ({ db, close } = await makeTestDb());
});
afterEach(async () => {
  await close();
});

describe("persistCrawl", () => {
  it("ghi agent, pages và chunks trong một lần", async () => {
    const agent = await persistCrawl(db, {
      sourceUrl: "https://senspa.vn",
      mode: "live",
      crawl: CRAWL,
    });

    expect(agent.pythonSessionId).toBe("a73534289394");
    expect(agent.kbFacts).toEqual(["Massage 60 phút: 350.000đ"]);

    const agg = await getAgentAggregate(db, agent.slug);
    expect(agg?.pages).toHaveLength(2);
    expect(agg?.chunks).toHaveLength(3);
  });

  it("giữ thứ tự chunks bằng cột ord", async () => {
    const agent = await persistCrawl(db, {
      sourceUrl: "https://senspa.vn",
      mode: "live",
      crawl: CRAWL,
    });
    const agg = await getAgentAggregate(db, agent.slug);
    expect(agg?.chunks.map((c) => c.content)).toEqual(["chunk A", "chunk B", "chunk C"]);
  });

  it("gán sourceUrl của chunk là URL gốc và source là web", async () => {
    const agent = await persistCrawl(db, {
      sourceUrl: "https://senspa.vn",
      mode: "live",
      crawl: CRAWL,
    });
    const agg = await getAgentAggregate(db, agent.slug);
    expect(agg?.chunks[0]?.source).toBe("web");
    expect(agg?.chunks[0]?.sourceUrl).toBe("https://senspa.vn");
  });

  it("ghi mode fixture kèm fixtureKey và degraded", async () => {
    const agent = await persistCrawl(db, {
      sourceUrl: "https://senspa.vn",
      mode: "fixture",
      fixtureKey: "senspa",
      degraded: true,
      crawl: CRAWL,
    });
    expect(agent.mode).toBe("fixture");
    expect(agent.fixtureKey).toBe("senspa");
    expect(agent.degraded).toBe(true);
  });

  it("crawl không có chunks vẫn tạo được agent", async () => {
    const agent = await persistCrawl(db, {
      sourceUrl: "https://trong.vn",
      mode: "live",
      crawl: { ...CRAWL, chunks: [], totalChunks: 0, pages: [] },
    });
    const agg = await getAgentAggregate(db, agent.slug);
    expect(agg?.chunks).toHaveLength(0);
  });

  it("rollback toàn bộ khi insert crawledPages thất bại, không để lại agent mồ côi", async () => {
    const failingDb = wrapDbFailingOnInsertInto(db, crawledPages);

    await expect(
      persistCrawl(failingDb, {
        sourceUrl: "https://senspa.vn",
        mode: "live",
        crawl: CRAWL,
      }),
    ).rejects.toThrow(/boom/);

    const rows = await db.select().from(agents);
    expect(rows).toHaveLength(0);
  });

  it("rollback toàn bộ khi insert kbChunks thất bại, không để lại agent mồ côi", async () => {
    const failingDb = wrapDbFailingOnInsertInto(db, kbChunks);

    await expect(
      persistCrawl(failingDb, {
        sourceUrl: "https://senspa.vn",
        mode: "live",
        crawl: CRAWL,
      }),
    ).rejects.toThrow(/boom/);

    const rows = await db.select().from(agents);
    expect(rows).toHaveLength(0);
  });
});

describe("replaceKbChunks", () => {
  it("thay thế toàn bộ chunks, không chèn thêm", async () => {
    const agent = await persistCrawl(db, {
      sourceUrl: "https://senspa.vn",
      mode: "live",
      crawl: CRAWL,
    });

    const written = await replaceKbChunks(db, agent.id, [
      { content: "web 1", source: "web", sourceUrl: "https://senspa.vn" },
      { content: "pdf 1", source: "pdf", sourceUrl: null },
    ]);

    expect(written).toBe(2);
    const agg = await getAgentAggregate(db, agent.slug);
    expect(agg?.chunks).toHaveLength(2);
    expect(agg?.chunks.map((c) => c.source)).toEqual(["web", "pdf"]);
  });

  it("không ảnh hưởng chunks của agent khác", async () => {
    const a = await persistCrawl(db, { sourceUrl: "https://a.vn", mode: "live", crawl: CRAWL });
    const b = await persistCrawl(db, { sourceUrl: "https://b.vn", mode: "live", crawl: CRAWL });

    await replaceKbChunks(db, a.id, [{ content: "chỉ của a", source: "web", sourceUrl: null }]);

    expect((await getAgentAggregate(db, a.slug))?.chunks).toHaveLength(1);
    expect((await getAgentAggregate(db, b.slug))?.chunks).toHaveLength(3);
  });
});

describe("getAgentAggregate", () => {
  it("trả undefined với slug không tồn tại", async () => {
    expect(await getAgentAggregate(db, "khongcogi12")).toBeUndefined();
  });
});
