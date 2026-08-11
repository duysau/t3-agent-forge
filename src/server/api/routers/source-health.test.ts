import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeTestDb } from "~/test/db";
import type { Db } from "~/server/db/types";
import { createCallerFactory } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { createFixtureSource } from "~/server/agentforge/fixture-source";
import { AgentForgeError } from "~/server/agentforge/errors";
import type { AgentForgeSource } from "~/server/agentforge/source";

let db: Db;
let close: () => Promise<void>;

function caller(source: AgentForgeSource) {
  return createCallerFactory(appRouter)({ db, source, fallbackEnabled: true });
}

beforeEach(async () => {
  ({ db, close } = await makeTestDb());
});
afterEach(async () => {
  await close();
});

describe("source.health", () => {
  it("backend sống thì trả up", async () => {
    const out = await caller(createFixtureSource("senspa", { delayMs: 0 })).source.health();
    expect(out).toEqual({ backend: "up", reason: null });
  });

  it("backend chết thì trả down kèm lý do, KHÔNG throw", async () => {
    const dead: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      health: vi
        .fn()
        .mockRejectedValue(new AgentForgeError("network", "Không kết nối được backend", null)),
    };

    const out = await caller(dead).source.health();

    expect(out.backend).toBe("down");
    expect(out.reason).toContain("Không kết nối được backend");
  });

  it("lỗi lạ cũng trả down chứ không làm vỡ trang", async () => {
    const weird: AgentForgeSource = {
      ...createFixtureSource("senspa", { delayMs: 0 }),
      kind: "live",
      health: vi.fn().mockRejectedValue(new Error("boom")),
    };

    const out = await caller(weird).source.health();
    expect(out.backend).toBe("down");
  });
});
