"use client";

import type { ComponentProps } from "react";
import { cn } from "~/lib/utils";
import { SelectTrigger } from "~/components/ui/select";

/**
 * Trigger cho các select trên thanh header: một ô vuông 44px chỉ chứa icon.
 *
 * Là component dùng chung chứ không phải chuỗi class copy hai lần: hai trigger này nằm
 * SÁT NHAU trên header, nên lệch một bậc padding hay một màu hover là nhìn thấy ngay.
 * Một chỗ sửa thì cả hai đi cùng nhau.
 *
 * - `chevron={false}`: mũi xuống ngốn 20px mà không nói thêm gì — icon trên trigger đã
 *   đổi theo lựa chọn hiện tại, còn tên thì nằm ở `aria-label`/`title`.
 * - `size-11` (44px): ngưỡng touch target tối thiểu. Ở mobile hai nút này nằm NGOÀI
 *   panel hamburger, tức là đích chạm thật chứ không phải icon trang trí.
 * - `data-[size=default]:h-11` phải khai lại: base của `SelectTrigger` đặt
 *   `data-[size=default]:h-9`, và selector có attribute nên nó thắng `size-11` trần.
 */
export function HeaderSelectTrigger({
  className,
  ...props
}: ComponentProps<typeof SelectTrigger>) {
  return (
    <SelectTrigger
      chevron={false}
      className={cn(
        "size-11 justify-center border-transparent bg-transparent px-0 text-gray-700 shadow-none hover:bg-gray-100 data-[size=default]:h-11 dark:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
