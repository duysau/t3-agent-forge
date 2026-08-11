import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getAgentBySlug } from "~/server/db/queries/agents";
import { withSessionRecovery } from "~/server/services/session-bridge";

export const chatRouter = createTRPCRouter({
  send: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        message: z.string().trim().min(1),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            }),
          )
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await getAgentBySlug(ctx.db, input.slug);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy agent" });

      // History đi từ client lên. Session backend có thể vừa được hồi sinh, và
      // restore không mang theo lịch sử hội thoại — tin vào state backend là cách
      // để bot mất ngữ cảnh đúng lúc không ai hiểu tại sao.
      return withSessionRecovery({ db: ctx.db, source: ctx.source }, agent.id, (sid) =>
        ctx.source.chat({ sessionId: sid, message: input.message, history: input.history }),
      );
    }),
});
