/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { env } from "~/env";
import { resolveSource } from "~/server/agentforge/resolve";
import { AgentForgeError } from "~/server/agentforge/errors";
import type { Db } from "~/server/db/types";
import type { AgentForgeSource } from "~/server/agentforge/source";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the AgentForge
 * source, and whether fallback to fixture data is enabled.
 *
 * @see https://trpc.io/docs/server/context
 */
export interface TrpcContext {
  db: Db;
  source: AgentForgeSource;
  fallbackEnabled: boolean;
}

export const createTRPCContext = async (_opts: { headers: Headers }): Promise<TrpcContext> => ({
  db: db as unknown as Db,
  source: resolveSource({ mode: "live", baseUrl: env.PYTHON_API_URL }),
  fallbackEnabled: env.FALLBACK_TO_FIXTURE,
});

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: cause instanceof ZodError ? cause.flatten() : null,
        agentForgeKind: cause instanceof AgentForgeError ? cause.kind : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/** Đổi `AgentForgeError` thành `TRPCError` đúng code, một lần cho mọi procedure. */
const mapAgentForgeErrors = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    if (!(err instanceof AgentForgeError)) throw err;
    const code =
      err.kind === "bad_request"
        ? "BAD_REQUEST"
        : err.kind === "upstream"
          ? "BAD_GATEWAY"
          : err.kind === "timeout"
            ? "TIMEOUT"
            : "INTERNAL_SERVER_ERROR";
    throw new TRPCError({ code, message: err.detail ?? err.message, cause: err });
  }
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(mapAgentForgeErrors);
