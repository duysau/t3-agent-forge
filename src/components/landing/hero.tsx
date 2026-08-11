import { ArrowRight, Check } from "lucide-react";
import { Mascot } from "~/components/layout/mascot";
import { Stats } from "./stats";

export function Hero() {
  return (
    <section className="overflow-hidden border-b border-border bg-[radial-gradient(1200px_500px_at_80%_-10%,rgb(83_113_236/0.18),transparent_60%),radial-gradient(900px_500px_at_10%_110%,rgb(32_58_220/0.1),transparent_55%),linear-gradient(180deg,#fff,var(--gray-50))] pt-16 pb-10 max-[640px]:pt-10 max-[640px]:pb-[30px]">
      <div className="mx-auto max-w-[1160px] px-6">
        <div className="grid items-center gap-9 min-[900px]:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-fci-100 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-fci-700 shadow-xs">
              <span className="relative size-2 rounded-full bg-success">
                <span className="absolute inset-0 animate-ping-ring rounded-full bg-success" />
              </span>
              Self-serve trial · Không cần cài đặt · Miễn phí
            </div>

            <h1 className="mt-5 mb-4 text-[46px] leading-[1.06] font-extrabold tracking-[-0.03em] text-balance max-[900px]:text-[38px] max-[640px]:text-[31px]">
              Dán website của bạn.
              <br />
              <span className="bg-gradient-to-r from-fci-500 to-fci-300 bg-clip-text text-transparent">
                30 phút sau có AI Agent chạy được.
              </span>
            </h1>

            <p className="mb-7 max-w-[560px] text-[18px] text-gray-600">
              AgentForge tự crawl dữ liệu doanh nghiệp, dựng agent trên FPT AI Chat hoặc FPT AI
              Engage, tự sinh 20 bài kiểm định chất lượng và xuất trang demo chia sẻ được — tất cả
              trong một luồng.
            </p>

            <div className="flex flex-wrap items-center gap-3.5">
              <a
                href="#studio"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-[13px] text-base font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-fci-600"
              >
                Tạo agent của tôi
                <ArrowRight className="size-[18px]" />
              </a>
              <a
                href="#studio"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-[13px] text-base font-semibold text-gray-700 shadow-xs transition-colors hover:border-gray-400 hover:bg-gray-50"
              >
                Xem demo mẫu
              </a>
            </div>

            <p className="mt-3.5 flex items-center gap-2 text-[13px] text-gray-500">
              <Check className="size-4 text-success" strokeWidth={2.5} />
              Đã dùng cho hơn 200 doanh nghiệp SME · Tiếng Việt là sân nhà
            </p>
          </div>

          <div className="relative flex items-center justify-center max-[900px]:mt-2.5">
            <Mascot />
          </div>
        </div>

        <Stats />
      </div>
    </section>
  );
}
