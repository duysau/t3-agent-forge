import { FileSearch, Rocket, Share2, SlidersHorizontal } from "lucide-react";
import type { ComponentType } from "react";

const STEPS: ReadonlyArray<{
  icon: ComponentType<{ className?: string }>;
  kicker: string;
  title: string;
  body: string;
}> = [
  {
    icon: FileSearch,
    kicker: "Bước 1",
    // Cố ý KHÔNG trùng chữ với tiêu đề panel Bước 1 trong wizard ("Gắn nguồn dữ
    // liệu"): hai heading giống hệt nhau trên cùng một trang làm người dùng
    // screen reader không phân biệt được đang nghe khối marketing hay khối thao
    // tác thật, và cũng làm mọi truy vấn theo tên heading trở nên nhập nhằng.
    title: "Dán website của bạn",
    body: "Dán URL website. Hệ thống crawl các trang chính, bóc text thành knowledge base. Thêm PDF bảng giá nếu cần.",
  },
  {
    icon: SlidersHorizontal,
    kicker: "Bước 2",
    // "Chọn sản phẩm" là chuỗi con của panel Bước 2 ("Chọn sản phẩm FPT.AI"), nên
    // một truy vấn regex theo tên vẫn khớp cả hai. Đặt tên khác hẳn.
    title: "Chat hay thoại",
    body: "FPT AI Chat cho kênh chat, hoặc FPT AI Engage cho kênh thoại kèm chọn giọng đọc. Cùng một nguồn dữ liệu.",
  },
  {
    icon: Rocket,
    kicker: "Bước 3",
    // Cùng lý do với Bước 1: panel Bước 3 trong wizard đã tên là "Dựng & kiểm định".
    title: "Tự dựng & tự chấm điểm",
    body: "LLM sinh persona, system prompt và guardrails, rồi tự sinh 20 bài test và tự chấm điểm minh bạch.",
  },
  {
    icon: Share2,
    kicker: "Bước 4",
    title: "Demo chia sẻ",
    body: "Nhận trang demo mang branding của khách, kèm link và mã QR gửi được cho người khác xem ngay.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="border-t border-border bg-gray-25 py-16 max-[640px]:py-12"
    >
      <div className="mx-auto max-w-[1160px] px-6 max-[640px]:px-4">
        <h2
          id="how-heading"
          className="text-center text-[30px] font-extrabold tracking-[-0.02em] text-balance max-[640px]:text-[24px]"
        >
          Bốn bước, một luồng liền mạch
        </h2>
        <p className="mx-auto mt-2.5 mb-10 max-w-[620px] text-center text-[15px] text-gray-600">
          Không rời trình duyệt, không cài đặt, không cần đội kỹ thuật đứng sau.
        </p>

        <ol className="grid gap-4 min-[900px]:grid-cols-4 min-[640px]:grid-cols-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.kicker}
                className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-fci-50 text-fci-600">
                  <Icon className="size-5" />
                </span>
                <div className="mt-4 text-[11px] font-semibold tracking-[0.06em] text-gray-500 uppercase">
                  {s.kicker}
                </div>
                <h3 className="mt-1 text-[16px] font-bold text-gray-900">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-[1.6] text-gray-600">{s.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
