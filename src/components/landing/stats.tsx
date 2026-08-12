const STATS = [
  { num: "10 phút", lbl: "thay vì nhiều tuần onboarding thủ công" },
  { num: "20 bài test", lbl: "tự động chấm điểm, minh bạch chất lượng agent" },
  { num: "Đa sản phẩm", lbl: "1 nguồn dữ liệu → chạy trên cả hệ FPT.AI: AI Chat, AI Engage & mở rộng" },
] as const;

export function Stats() {
  return (
    <div className="mt-10 grid gap-4 min-[900px]:grid-cols-3">
      {STATS.map((s) => (
        <div key={s.num} className="rounded-xl border border-border bg-surface px-[22px] py-5 shadow-sm">
          {/*
            Bỏ `whitespace-nowrap`: "Đa sản phẩm" ở 32px rộng hơn khung nội dung
            trên màn 375px, nên `nowrap` đẩy chữ tràn ngang thay vì cho nó xuống
            dòng. `text-balance` chia dòng cân đối khi phải wrap, và cỡ chữ giảm
            còn 27px dưới 640px để hai chữ vẫn thường xuyên vừa một dòng.
          */}
          <div className="text-[32px] leading-tight font-extrabold tracking-[-0.03em] text-balance text-fci-600 max-[640px]:text-[27px]">
            {s.num}
          </div>
          <div className="mt-2 text-[13px] font-medium text-gray-500">{s.lbl}</div>
        </div>
      ))}
    </div>
  );
}
