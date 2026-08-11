import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getAgentAggregate } from "~/server/services/agent-store";
import { getLatestEvalRun } from "~/server/db/queries/eval";
import type { EvalResult, Persona } from "~/server/agentforge/schemas";

export interface DemoPayload {
  slug: string;
  status: string;
  product: "chat" | "voice" | null;
  voiceId: string | null;
  /**
   * Fixture mode được CHỌN có chủ đích trả `degraded: false`, nên `degraded` một
   * mình không đủ để trang công khai dán nhãn dữ liệu mẫu. Sibling `source.bySlug`
   * đã phơi `mode` từ trước; payload này thiếu nó là lý do `/s/[slug]` vẽ được một
   * brand fixture kèm bảng điểm 20 bài mà không có nhãn nào.
   */
  mode: "live" | "fixture";
  degraded: boolean;
  brandName: string | null;
  brandColor: string;
  brandLogoLetter: string | null;
  brandLogoEmoji: string | null;
  industry: string | null;
  persona: Persona | null;
  guardrails: string[];
  kbFacts: string[];
  chunkCount: number;
  evalSummary: EvalResult["summary"] | null;
  evalResults: EvalResult["results"];
}

/**
 * Payload cho trang demo công khai. Đọc **toàn bộ từ Postgres**, không gọi backend —
 * nên `/s/[slug]` mở được cả khi backend đang chết. Chỉ việc *chat* mới cần backend sống.
 *
 * Agent chưa build xong vẫn trả về được, với `persona` và `evalSummary` là null. Trang
 * demo hiển thị trạng thái dở dang thì hữu ích hơn là một lỗi.
 */
export const demoRouter = createTRPCRouter({
  bySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }): Promise<DemoPayload> => {
      const agg = await getAgentAggregate(ctx.db, input.slug);
      if (!agg) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy agent" });

      // Cùng quy tắc với agent.evalRun: bảng điểm chỉ hiện khi status là "evaluated".
      // Dựng lại agent hạ status về "built", và bảng điểm cũ thôi mô tả đúng agent đó.
      const run =
        agg.agent.status === "evaluated"
          ? await getLatestEvalRun(ctx.db, agg.agent.id)
          : undefined;

      return {
        slug: agg.agent.slug,
        status: agg.agent.status,
        product: agg.agent.product as "chat" | "voice" | null,
        voiceId: agg.agent.voiceId,
        mode: agg.agent.mode as "live" | "fixture",
        degraded: agg.agent.degraded,
        brandName: agg.agent.brandName,
        brandColor: agg.agent.brandColor,
        brandLogoLetter: agg.agent.brandLogoLetter,
        brandLogoEmoji: agg.agent.brandLogoEmoji,
        industry: agg.agent.industry,
        persona: (agg.agent.persona as Persona | null) ?? null,
        guardrails: (agg.agent.guardrails as string[] | null) ?? [],
        kbFacts: (agg.agent.kbFacts as string[] | null) ?? [],
        chunkCount: agg.chunks.length,
        evalSummary: run?.summary ?? null,
        evalResults: run?.results ?? [],
      };
    }),
});
