const NAV = ["Sản phẩm", "Giải pháp", "Bảng giá", "Tài liệu", "Về FPT.AI"];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-[1160px] items-center gap-8 px-6 max-[640px]:px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[34px] place-items-center rounded-[9px] bg-linear-135 from-fci-400 to-fci-600 text-[17px] font-extrabold text-white shadow-glow">
            A
          </span>
          <div className="text-[19px] font-extrabold tracking-[-0.02em] leading-tight">
            AgentForge
            <div className="text-xs font-medium tracking-normal text-gray-400">
              by FPT Smart Cloud
            </div>
          </div>
        </div>

        {/* Chưa có trang nào để dẫn tới, nên đây là chữ, không phải link:
            một <a href="#"> vẫn được đọc là link và vẫn nhận focus — tức là
            hứa một tính năng không tồn tại. */}
        <nav aria-label="Điều hướng chính" className="hidden gap-[26px] text-[15px] font-medium text-gray-600 min-[900px]:flex">
          {NAV.map((label, i) => (
            <span key={label} className={i === 0 ? "font-semibold text-primary" : undefined}>
              {label}
            </span>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3.5">
          <div className="flex gap-1.5 text-[13px] font-semibold text-gray-400">
            <span className="text-gray-900">VIE</span>|<span>ENG</span>
          </div>
          <button
            type="button"
            disabled
            title="Bản dùng thử chưa cần đăng nhập"
            className="rounded-md px-3 py-1.5 text-[13px] font-semibold text-gray-600 opacity-50"
          >
            Đăng nhập
          </button>
          <a
            href="#studio"
            className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-fci-600"
          >
            Dùng thử miễn phí
          </a>
        </div>
      </div>
    </header>
  );
}
