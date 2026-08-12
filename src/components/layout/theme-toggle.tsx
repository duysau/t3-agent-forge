"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Nút đổi sáng/tối.
 *
 * `mounted` không phải phòng xa suông: theme thật chỉ biết được ở trình duyệt
 * (localStorage hoặc `prefers-color-scheme`), nên nếu render icon theo
 * `resolvedTheme` ngay lượt đầu, HTML server sinh ra sẽ khác HTML client dựng —
 * đúng định nghĩa hydration mismatch, và React sẽ cảnh báo rồi vứt cây đi dựng lại.
 *
 * Trước khi mounted vẫn render một nút CÙNG KÍCH THƯỚC (chỉ ẩn icon) thay vì
 * `return null`: trả null làm header co lại rồi giãn ra khi JS chạy xong — một cú
 * nhảy layout (CLS) ngay trên thanh điều hướng.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      // `aria-label` đổi theo trạng thái vì đây là nút chỉ có icon — không có chữ
      // nào để screen reader đọc. Nhãn nói HÀNH ĐỘNG sắp xảy ra, không phải trạng
      // thái hiện tại, vì đó là thứ người dùng cần biết trước khi bấm.
      aria-label={mounted ? (isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối") : "Đổi giao diện sáng/tối"}
      title={mounted ? (isDark ? "Giao diện sáng" : "Giao diện tối") : undefined}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="grid size-11 cursor-pointer place-items-center rounded-md text-gray-600 transition-colors outline-none hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {mounted &&
        (isDark ? (
          <Sun aria-hidden className="size-[18px]" />
        ) : (
          <Moon aria-hidden className="size-[18px]" />
        ))}
    </button>
  );
}
