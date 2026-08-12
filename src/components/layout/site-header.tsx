"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const NAV = ["Sản phẩm", "Giải pháp", "Bảng giá", "Tài liệu", "Về FPT.AI"];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  /**
   * Esc để đóng, và trả focus về đúng nút đã mở nó. Không trả focus thì sau khi
   * đóng menu, focus rơi về <body> và lần Tab kế tiếp bắt đầu lại từ đầu trang —
   * người dùng bàn phím mất chỗ.
   */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    // Bấm ra ngoài thì đóng. Dùng `pointerdown` chứ không phải `click`: `click`
    // chỉ bắn sau khi nhả chuột, nên kéo-thả từ trong panel ra ngoài cũng đóng
    // panel — không phải ý định của người dùng.
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !toggleRef.current?.contains(t)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-[1160px] items-center gap-8 px-6 max-[640px]:px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[34px] place-items-center rounded-[9px] bg-linear-135 from-fci-400 to-fci-600 text-[17px] font-extrabold text-white shadow-glow">
            A
          </span>
          <div className="text-[19px] font-extrabold tracking-[-0.02em] leading-tight">
            AgentForge
            <div className="text-xs font-medium tracking-normal text-gray-500">
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

        {/*
          Nhóm điều khiển thật. Dưới 900px nó chuyển vào panel bung xuống, nhưng
          vẫn là MỘT bản duy nhất trong DOM — không nhân đôi thành bản desktop +
          bản mobile. Nhân đôi nghĩa là hai `<a href="#studio">` cùng tên cho
          screen reader, và hai chỗ phải sửa mỗi lần đổi CTA.

          `max-[900px]:` biến nó thành panel tuyệt đối ngay dưới header; từ 900px
          trở lên các class đó tắt và nó trở lại một hàng ngang bình thường.
        */}
        <div
          ref={panelRef}
          id="header-controls"
          data-testid="header-controls"
          className={[
            "flex items-center gap-3.5",
            "max-[900px]:absolute max-[900px]:top-17 max-[900px]:right-0 max-[900px]:left-0",
            "max-[900px]:flex-col-reverse max-[900px]:items-stretch max-[900px]:gap-3",
            "max-[900px]:border-b max-[900px]:border-border max-[900px]:bg-surface",
            "max-[900px]:px-6 max-[900px]:py-5 max-[900px]:shadow-lg",
            // `hidden` của Tailwind là `display:none` — bỏ hẳn khỏi thứ tự tab khi
            // đóng, nên không có bẫy focus vào phần tử vô hình.
            open ? "max-[900px]:flex" : "max-[900px]:hidden",
          ].join(" ")}
        >
          <div className="flex items-center gap-3.5 max-[900px]:justify-between">
            <div className="flex gap-1.5 text-[13px] font-semibold text-gray-500">
              <span className="text-gray-900">VIE</span>|<span>ENG</span>
            </div>
            <ThemeToggle />
            <button
              type="button"
              disabled
              title="Bản dùng thử chưa cần đăng nhập"
              className="inline-flex min-h-11 items-center rounded-md px-3 text-[13px] font-semibold text-gray-600 opacity-50"
            >
              Đăng nhập
            </button>
          </div>
          {/*
            `min-h-11` (44px) là ngưỡng touch target tối thiểu. `py-1.5` cũ cho
            chiều cao ~29px — nhỏ hơn nhiều so với ngón tay, trên đúng nút CTA
            chính của header. Dùng `inline-flex items-center` để chữ vẫn giữa
            khi chiều cao do `min-h` quyết định chứ không do padding.
          */}
          <a
            href="#studio"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-xs transition-colors outline-none hover:bg-fci-600 focus-visible:ring-3 focus-visible:ring-ring/50 max-[900px]:justify-center"
          >
            Dùng thử miễn phí
          </a>
        </div>

        {/*
          Nút hamburger chỉ tồn tại dưới 900px — đúng khoảng mà nhóm điều khiển bị
          gập lại. `aria-expanded` + `aria-controls` để screen reader biết nút này
          điều khiển cái gì và đang mở hay đóng.
        */}
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls="header-controls"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          onClick={() => setOpen((v) => !v)}
          className="hidden size-11 cursor-pointer place-items-center rounded-md text-gray-700 transition-colors outline-none hover:bg-gray-100 focus-visible:ring-3 focus-visible:ring-ring/50 max-[900px]:grid"
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>
    </header>
  );
}
