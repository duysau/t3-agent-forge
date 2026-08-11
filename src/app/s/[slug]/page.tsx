import { cache } from "react";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { BrandBar } from "~/components/demo/brand-bar";
import { ChatDemo } from "~/components/demo/chat-demo";
import { NotBuiltNotice } from "~/components/demo/not-built-notice";
import { EvalSummary } from "~/components/studio/eval-summary";
import { isAgentBuilt } from "~/lib/agent-status";
import { api } from "~/trpc/server";
import type { DemoPayload } from "~/server/api/routers/demo";

export const dynamic = "force-dynamic";

type LoadResult =
  | { kind: "ok"; data: DemoPayload }
  | { kind: "not-found" }
  | { kind: "unavailable" };

/**
 * `generateMetadata` và `DemoPage` đều cần payload này trên MỖI request — với
 * `force-dynamic` không có cache trang nào khử trùng lặp hai lệnh gọi đó, nên
 * bọc trong `cache()` của React để chỉ một round-trip Postgres cho mỗi request.
 *
 * Phải phân biệt rõ hai loại thất bại, KHÔNG gộp chung về một `null`:
 * - `demo.bySlug` raise `TRPCError` code `NOT_FOUND` khi slug không tồn tại —
 *   đây là not-found thật, gọi `notFound()`.
 * - Bất cứ lỗi nào khác (Postgres không kết nối được, lỗi không xác định...)
 *   KHÔNG được biến thành "không tìm thấy trang demo" — nói vậy là sai sự
 *   thật với người đang cầm một link hợp lệ, và trang này tồn tại đúng để
 *   sống sót qua hạ tầng chết. Phải hiện thông báo trung thực là hệ thống
 *   đang gặp sự cố, không gọi `notFound()`.
 */
const load = cache(async (slug: string): Promise<LoadResult> => {
  try {
    const data = await api.demo.bySlug({ slug });
    return { kind: "ok", data };
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") {
      return { kind: "not-found" };
    }
    return { kind: "unavailable" };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await load(slug);
  const brandName = result.kind === "ok" ? result.data.brandName : null;
  return {
    title: brandName ? `${brandName} — Demo AI Agent` : "Demo AI Agent — AgentForge",
  };
}

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await load(slug);

  if (result.kind === "not-found") notFound();

  if (result.kind === "unavailable") {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center max-[640px]:px-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Không tải được trang demo</h1>
        <p className="mt-2 rounded-lg bg-error-muted px-4 py-3 text-[13px] text-error-strong">
          Hệ thống đang gặp sự cố, chưa thể mở trang demo lúc này. Vui lòng thử lại sau ít phút.
        </p>
      </div>
    );
  }

  const d = result.data;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 max-[640px]:px-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
        <BrandBar
          name={d.brandName}
          letter={d.brandLogoLetter}
          emoji={d.brandLogoEmoji}
          color={d.brandColor}
          product={d.product}
          mode={d.mode}
          degraded={d.degraded}
        />
        {/*
          `demo.bySlug` cố tình phục vụ cả agent chưa dựng, và `status` đi kèm
          payload chính vì lúc này: một link chia sẻ ngay sau Bước 1 mở ra một ô
          chat gắn vào agent có system prompt rỗng. Hiện trạng thái thật thay vì
          hứa một thứ chưa tồn tại.
        */}
        {isAgentBuilt(d.status) ? (
          <ChatDemo slug={slug} suggested={d.kbFacts.slice(0, 3)} />
        ) : (
          <NotBuiltNotice />
        )}
      </div>

      {d.evalSummary && <EvalSummary summary={d.evalSummary} />}

      <p className="mt-[22px] flex items-center justify-center gap-1.5 text-center text-[12.5px] text-gray-400">
        Trang demo do AgentForge sinh tự động · FPT Smart Cloud
      </p>
    </div>
  );
}
