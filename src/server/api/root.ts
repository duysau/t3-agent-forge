import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { agentRouter } from "~/server/api/routers/agent";
import { sourceRouter } from "~/server/api/routers/source";
import { chatRouter } from "~/server/api/routers/chat";
import { demoRouter } from "~/server/api/routers/demo";

export const appRouter = createTRPCRouter({
  source: sourceRouter,
  agent: agentRouter,
  chat: chatRouter,
  demo: demoRouter,
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
