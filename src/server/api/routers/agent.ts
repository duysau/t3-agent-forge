import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getAgentBySlug, updateAgent } from "~/server/db/queries/agents";
import { sourceForAgent } from "~/server/agentforge/resolve";
import { saveBuildArtifacts } from "~/server/services/agent-store";
import { withSessionRecovery } from "~/server/services/session-bridge";
import { getLatestEvalRun, saveEvalRun } from "~/server/db/queries/eval";
import { DEFAULT_VOICE_ID } from "~/lib/voices";
import type { Db } from "~/server/db/types";

const voiceIdSchema = z.enum(["std_kimngan", "std_minhquang"]);
const slugInput = z.object({ slug: z.string().min(1) });

async function requireAgent(ctx: { db: Db }, slug: string) {
  const agent = await getAgentBySlug(ctx.db, slug);
  if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy agent" });
  return agent;
}

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

  build: publicProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    const agent = await requireAgent(ctx, input.slug);

    // `product` lấy từ DB, không từ input: nó đã được người dùng chọn ở Bước 2, và
    // để client gửi lại là mở đường cho việc dựng agent theo hình thái họ không chọn.
    const product = agent.product as "chat" | "voice" | null;
    if (!product) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Chưa chọn sản phẩm — hãy hoàn thành Bước 2 trước",
      });
    }

    // `mode` cũng lấy từ DB, cùng lý lẽ với `product` ở trên: người dùng đã chọn
    // "kịch bản mẫu (chạy offline)" ở Bước 1 và lựa chọn đó nằm trên row. Dùng
    // `ctx.source` (luôn live) sẽ gọi backend mà kịch bản mẫu tồn tại để tránh.
    const source = sourceForAgent(agent, ctx.source);

    const built = await withSessionRecovery({ db: ctx.db, source }, agent.id, (sid) =>
      source.build({ sessionId: sid, product }),
    );

    const saved = await saveBuildArtifacts(ctx.db, agent.id, built);

    return {
      persona: built.persona,
      systemPrompt: built.systemPrompt,
      guardrails: built.guardrails,
      brandName: saved.brandName,
      brandLogoLetter: saved.brandLogoLetter,
      industry: saved.industry,
    };
  }),

  evaluate: publicProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    const agent = await requireAgent(ctx, input.slug);

    const product = agent.product as "chat" | "voice" | null;
    if (!product) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Chưa chọn sản phẩm — hãy hoàn thành Bước 2 trước",
      });
    }
    if (agent.status === "draft") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Chưa dựng agent — hãy chạy bước dựng trước khi kiểm định",
      });
    }

    const source = sourceForAgent(agent, ctx.source);

    const evaluated = await withSessionRecovery({ db: ctx.db, source }, agent.id, (sid) =>
      source.evaluate({ sessionId: sid, product }),
    );

    await saveEvalRun(ctx.db, agent.id, evaluated);
    await updateAgent(ctx.db, agent.id, { status: "evaluated" });

    return { ...evaluated.summary, results: evaluated.results };
  }),

  /**
   * Chỉ trả bảng điểm khi agent đang ở trạng thái "evaluated".
   *
   * Dựng lại agent đặt status về "built" và sinh system prompt mới, nên bảng điểm của
   * lượt eval trước không còn chấm cho agent hiện tại nữa. Không xoá dữ liệu cũ — chỉ
   * ngừng hiển thị nó tới khi có lượt eval mới. Hiện một bảng điểm chấm cho prompt đã
   * bị thay là nói sai về chất lượng agent, và người xem không có cách nào biết.
   */
  evalRun: publicProcedure.input(slugInput).query(async ({ ctx, input }) => {
    const agent = await requireAgent(ctx, input.slug);
    if (agent.status !== "evaluated") return null;
    return (await getLatestEvalRun(ctx.db, agent.id)) ?? null;
  }),
});
