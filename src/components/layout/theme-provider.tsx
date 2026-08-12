"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * `next-themes` đã là dependency và `ui/sonner.tsx` đã gọi `useTheme()` từ trước —
 * nhưng không có provider nào trong cây, nên hook đó luôn trả về mặc định và toast
 * không bao giờ đổi theme. Đây là mảnh còn thiếu, không phải một lớp mới thêm vào.
 *
 * `attribute="class"` để khớp `@custom-variant dark` trong globals.css (dựa trên
 * class `.dark`), chứ không phải `data-theme`.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
