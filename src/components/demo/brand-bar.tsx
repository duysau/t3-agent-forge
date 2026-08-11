import { DegradedBadge, type SampleDataReason } from "~/components/ui/degraded-badge";

const PRODUCT_LABEL: Record<"chat" | "voice", string> = {
  chat: "⚡ powered by FPT AI Chat",
  voice: "⚡ powered by FPT AI Engage",
};

/**
 * Chỗ DUY NHẤT quyết định có dán nhãn dữ liệu mẫu hay không, và dán nhãn nào.
 *
 * `degraded` chỉ đúng khi ĐÃ tụt hạng sau một thất bại thật. Fixture mode được
 * chọn có chủ đích trả `degraded: false` (`resolve.ts`) — đúng, vì lệnh gọi đó
 * *thành công* — nên dựa vào riêng `degraded` là để dữ liệu mẫu ra tới trang công
 * khai mà không có nhãn nào. Trong studio người dùng biết họ chọn gì; một link đã
 * chia sẻ có khán giả khác.
 *
 * `degraded` thắng khi cả hai cùng đúng: một thất bại thật là điều quan trọng hơn
 * cần nói ra.
 */
function sampleDataReason(mode: string, degraded: boolean): SampleDataReason | null {
  if (degraded) return "fallback";
  if (mode === "fixture") return "chosen";
  return null;
}

export function BrandBar({
  name,
  letter,
  emoji,
  color,
  product,
  mode,
  degraded,
}: {
  name: string | null;
  letter: string | null;
  emoji: string | null;
  color: string;
  product: "chat" | "voice" | null;
  mode: string;
  degraded: boolean;
}) {
  const reason = sampleDataReason(mode, degraded);

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
        {/*
          `||` chứ không phải `??`: `??` chỉ rơi qua với null/undefined, nên một
          crawl trả về `""` (brand có trong response nhưng rỗng) render ra một badge
          logo trắng và một tiêu đề trắng trên trang công khai. Chuỗi rỗng ở đây là
          "không có giá trị", đúng như null.
        */}
        {emoji || letter || "A"}
      </span>
      <div className="flex-1">
        <div className="font-bold">{name || "Agent demo"}</div>
        <div className="text-[13px] text-white/80">
          {product === "voice" ? "Tổng đài tự động" : "Trợ lý tư vấn trực tuyến"}
        </div>
      </div>
      {reason && <DegradedBadge reason={reason} />}
      {product && <span className="text-xs text-white/80">{PRODUCT_LABEL[product]}</span>}
    </div>
  );
}
