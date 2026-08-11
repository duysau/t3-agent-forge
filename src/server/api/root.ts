import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { agentRouter } from "~/server/api/routers/agent";
import { sourceRouter } from "~/server/api/routers/source";

export const appRouter = createTRPCRouter({
  source: sourceRouter,
  agent: agentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.source.bySlug({ slug: "..." });
 */
export const createCaller = createCallerFactory(appRouter);
