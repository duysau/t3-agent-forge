import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AGENT_NOT_BUILT_MESSAGE, isAgentBuilt } from "~/lib/agent-status";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getAgentBySlug } from "~/server/db/queries/agents";
import { sourceForAgent } from "~/server/agentforge/resolve";
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

      // Agent chưa dựng thì system prompt còn null: restore sẽ gửi `system_prompt: ""`
      // và bot trả lời bằng một prompt rỗng. Trang demo có che ô chat lại, nhưng đó là
      // phép lịch sự — cái này là thủ tục, và nó phải đứng ngay cả khi client bỏ qua UI.
      if (!isAgentBuilt(agent.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: AGENT_NOT_BUILT_MESSAGE });
      }

      // Nguồn đọc từ `mode`/`fixtureKey` trên row, không từ `ctx.source` (luôn
      // live): một agent dựng bằng kịch bản mẫu phải chat được bằng kịch bản mẫu.
      const source = sourceForAgent(agent, ctx.source);

      // History đi từ client lên. Session backend có thể vừa được hồi sinh, và
      // restore không mang theo lịch sử hội thoại — tin vào state backend là cách
      // để bot mất ngữ cảnh đúng lúc không ai hiểu tại sao.
      return withSessionRecovery({ db: ctx.db, source }, agent.id, (sid) =>
        source.chat({ sessionId: sid, message: input.message, history: input.history }),
      );
    }),
});
