import { DegradedBadge } from "~/components/ui/degraded-badge";

const PRODUCT_LABEL: Record<"chat" | "voice", string> = {
  chat: "⚡ powered by FPT AI Chat",
  voice: "⚡ powered by FPT AI Engage",
};

export function BrandBar({
  name,
  letter,
  emoji,
  color,
  product,
  degraded,
}: {
  name: string | null;
  letter: string | null;
  emoji: string | null;
  color: string;
  product: "chat" | "voice" | null;
  degraded: boolean;
}) {
  return (
    <div
      data-testid="brand-bar"
      // Màu brand là DỮ LIỆU lấy từ website khách lúc chạy, không phải design token —
      // Tailwind không sinh được class cho giá trị nó chưa thấy lúc build.
      style={{ background: color }}
      className="flex flex-wrap items-center gap-3 px-5 py-4 text-white"
    >
      <span
        data-testid="brand-logo"
        className="grid size-10 place-items-center rounded-xl bg-white/20 text-lg font-bold"
      >
        {emoji ?? letter ?? "A"}
      </span>
      <div className="flex-1">
        <div className="font-bold">{name ?? "Agent demo"}</div>
        <div className="text-[13px] text-white/80">
          {product === "voice" ? "Tổng đài tự động" : "Trợ lý tư vấn trực tuyến"}
        </div>
      </div>
      {degraded && <DegradedBadge />}
      {product && <span className="text-xs text-white/80">{PRODUCT_LABEL[product]}</span>}
    </div>
  );
}
