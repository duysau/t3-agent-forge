const STATS = [
  { num: "30 phút", lbl: "thay vì nhiều tuần onboarding thủ công" },
  { num: "20 bài test", lbl: "tự động chấm điểm, minh bạch chất lượng agent" },
  { num: "Đa sản phẩm", lbl: "1 nguồn dữ liệu → chạy trên cả hệ FPT.AI: AI Chat, AI Engage & mở rộng" },
] as const;

export function Stats() {
  return (
    <div className="mt-10 grid gap-4 min-[900px]:grid-cols-3">
      {STATS.map((s) => (
        <div key={s.num} className="rounded-xl border border-border bg-white px-[22px] py-5 shadow-sm">
          <div className="text-[32px] leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap text-fci-600">
            {s.num}
          </div>
          <div className="mt-2 text-[13px] font-medium text-gray-500">{s.lbl}</div>
        </div>
      ))}
    </div>
  );
}
