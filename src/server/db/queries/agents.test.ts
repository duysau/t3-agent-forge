import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb } from "~/test/db";
import type { Db } from "~/server/db/types";
import { createAgent, getAgentBySlug, updateAgent } from "./agents";

let db: Db;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await makeTestDb());
});
afterEach(async () => {
  await close();
});

describe("createAgent", () => {
  it("sinh slug 12 ký tự và mặc định status draft, mode live", async () => {
    const agent = await createAgent(db, {
      sourceUrl: "https://senspa.vn",
      pythonSessionId: "a73534289394",
    });
    expect(agent.slug).toHaveLength(12);
    expect(agent.status).toBe("draft");
    expect(agent.mode).toBe("live");
    expect(agent.degraded).toBe(false);
    expect(agent.brandColor).toBe("#203ADC");
  });

  it("sinh slug khác nhau cho hai agent", async () => {
    const a = await createAgent(db, { sourceUrl: "https://a.vn" });
    const b = await createAgent(db, { sourceUrl: "https://b.vn" });
    expect(a.slug).not.toBe(b.slug);
  });

  it("ghi mode fixture kèm fixtureKey", async () => {
    const agent = await createAgent(db, {
      sourceUrl: "https://senspa.vn",
      mode: "fixture",
      fixtureKey: "senspa",
    });
    expect(agent.mode).toBe("fixture");
    expect(agent.fixtureKey).toBe("senspa");
  });
});

describe("getAgentBySlug", () => {
  it("tìm được agent vừa tạo", async () => {
    const created = await createAgent(db, { sourceUrl: "https://senspa.vn" });
    const found = await getAgentBySlug(db, created.slug);
    expect(found?.id).toBe(created.id);
  });

  it("trả undefined khi slug không tồn tại", async () => {
    expect(await getAgentBySlug(db, "khongtontai1")).toBeUndefined();
  });
});

describe("updateAgent", () => {
  it("cập nhật product và voiceId", async () => {
    const created = await createAgent(db, { sourceUrl: "https://bepnha.vn" });
    const updated = await updateAgent(db, created.id, {
      product: "voice",
      voiceId: "std_kimngan",
    });
    expect(updated.product).toBe("voice");
    expect(updated.voiceId).toBe("std_kimngan");
  });

  it("đẩy updatedAt lên sau khi sửa", async () => {
    const created = await createAgent(db, { sourceUrl: "https://bepnha.vn" });
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateAgent(db, created.id, { status: "built" });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });
});
