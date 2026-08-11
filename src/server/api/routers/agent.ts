import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getAgentBySlug, updateAgent } from "~/server/db/queries/agents";
import { DEFAULT_VOICE_ID } from "~/lib/voices";

const voiceIdSchema = z.enum(["std_kimngan", "std_minhquang"]);

export const agentRouter = createTRPCRouter({
  setProduct: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        product: z.enum(["chat", "voice"]),
        voiceId: voiceIdSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await getAgentBySlug(ctx.db, input.slug);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy agent" });

      // Giọng chỉ có nghĩa với FPT AI Engage. Chọn chat thì phải xoá,
      // nếu không bước 4 sẽ dựng voice demo từ dữ liệu cũ.
      const voiceId = input.product === "voice" ? (input.voiceId ?? DEFAULT_VOICE_ID) : null;

      const saved = await updateAgent(ctx.db, agent.id, { product: input.product, voiceId });
      return { slug: saved.slug, product: saved.product, voiceId: saved.voiceId };
    }),
});
