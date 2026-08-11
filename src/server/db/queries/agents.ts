import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { agents } from "~/server/db/schema";
import type { AgentRow, Db } from "~/server/db/types";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export interface NewAgentInput {
  sourceUrl: string;
  pythonSessionId?: string;
  mode?: "live" | "fixture";
  fixtureKey?: string;
}

export async function createAgent(db: Db, input: NewAgentInput): Promise<AgentRow> {
  const rows = await db
    .insert(agents)
    .values({
      slug: nanoid(),
      sourceUrl: input.sourceUrl,
      pythonSessionId: input.pythonSessionId,
      mode: input.mode ?? "live",
      fixtureKey: input.fixtureKey,
    })
    .returning();
  const row = rows[0];
  if (!row) throw new Error("createAgent: insert không trả về row");
  return row;
}

export async function getAgentBySlug(db: Db, slug: string): Promise<AgentRow | undefined> {
  const rows = await db.select().from(agents).where(eq(agents.slug, slug)).limit(1);
  return rows[0];
}

export async function getAgentById(db: Db, id: string): Promise<AgentRow | undefined> {
  const rows = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return rows[0];
}

export async function updateAgent(
  db: Db,
  id: string,
  patch: Partial<Omit<AgentRow, "id" | "slug" | "createdAt">>,
): Promise<AgentRow> {
  const rows = await db
    .update(agents)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(agents.id, id))
    .returning();
  const row = rows[0];
  if (!row) throw new Error(`updateAgent: không tìm thấy agent ${id}`);
  return row;
}
