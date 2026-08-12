import { ChevronDown } from "lucide-react";

/**
 * Nội dung FAQ là nguồn sự thật dùng cho HAI chỗ: phần hiển thị bên dưới và khối
 * JSON-LD `FAQPage`. Khai một lần để câu trả lời người đọc thấy luôn khớp với câu
 * trả lời gửi cho Google — lệch nhau là đúng định nghĩa cloaking.
 */
export const FAQS = [
  {
    q: "AgentForge lấy dữ liệu từ đâu?",
    a: "Từ chính website doanh nghiệp bạn dán vào. Hệ thống crawl các trang chính, bóc text thành knowledge base, và bạn có thể nạp thêm PDF bảng giá hoặc catalogue để bổ sung.",
  },
  {
    q: "Mất bao lâu để có agent chạy được?",
    a: "Khoảng 10 phút cho toàn bộ luồng 4 bước. Riêng bước crawl website có thể mất tới 3 phút tuỳ số trang, và bước dựng kèm kiểm định 20 bài test mất thêm vài phút.",
  },
  {
    q: "20 bài kiểm định là kiểm những gì?",
    a: "Hệ thống tự sinh 20 câu hỏi dựa trên knowledge base vừa trích xuất, tự gọi agent trả lời rồi tự chấm điểm từng câu. Bạn thấy được điểm tổng, điểm từng nhóm và có thể sửa đáp án mẫu cho từng bài.",
  },
  {
    q: "Agent chạy trên nền tảng nào?",
    a: "Trên hệ FPT.AI: FPT AI Chat cho kênh chat và FPT AI Engage cho kênh thoại. Cùng một nguồn dữ liệu dùng được cho cả hai, chọn ở Bước 2.",
  },
  {
    q: "Tôi có phải cài đặt gì không?",
    a: "Không. Toàn bộ chạy trên trình duyệt và bản dùng thử không cần đăng nhập. Kết quả là một trang demo có link chia sẻ được ngay.",
  },
  {
    q: "Dữ liệu website của tôi có bị dùng cho việc khác không?",
    a: "Dữ liệu crawl chỉ dùng để dựng knowledge base cho chính agent của bạn. Trang demo sinh ra không được search engine index — chỉ ai có link mới xem được.",
  },
] as const;

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="border-t border-border bg-surface py-16 max-[640px]:py-12"
    >
      <div className="mx-auto max-w-[760px] px-6 max-[640px]:px-4">
        <h2
          id="faq-heading"
          className="text-center text-[30px] font-extrabold tracking-[-0.02em] text-balance max-[640px]:text-[24px]"
        >
          Câu hỏi thường gặp
        </h2>
        <p className="mt-2.5 mb-9 text-center text-[15px] text-gray-600">
          Chưa rõ chỗ nào? Đây là những câu được hỏi nhiều nhất.
        </p>

        <div className="flex flex-col gap-2.5">
          {FAQS.map((item) => (
            /*
              `<details>`/`<summary>` thay vì accordion tự viết bằng state: mở/đóng
              bằng bàn phím, đọc đúng bởi screen reader, và nội dung nằm trong HTML
              tĩnh nên crawler thấy hết mà không cần chạy JS — đúng điều mình cần
              cho một khối nhắm rich result.
            */
            <details
              key={item.q}
              className="group rounded-xl border border-border bg-gray-25 px-5 transition-colors open:bg-surface hover:border-gray-300"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-gray-800 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-gray-500 transition-transform duration-200 group-open:-rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <p className="pb-4 text-sm leading-[1.65] text-gray-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
