"use client";

import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem } from "~/components/ui/select";
import { HeaderSelectTrigger } from "./header-select-trigger";

/**
 * Mã quốc gia hai chữ, thay cho lá cờ SVG.
 *
 * `w-5` cố định để nhãn của các dòng thẳng cột với nhau — chữ "vn" và "us" không cùng
 * bề rộng. `aria-hidden` vì tên ngôn ngữ đã viết bằng chữ ngay bên cạnh, đọc thêm "vn"
 * là đọc trùng.
 *
 * `opacity-70` trên màu chữ đang thừa hưởng, KHÔNG dùng `text-muted-foreground`: dòng
 * đang chọn được tô kín xanh nên chip phải theo màu chữ của dòng (trắng) thay vì giữ
 * một màu xám cố định — cùng một class dùng được cho cả hai trạng thái.
 */
function Code({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className="w-5 shrink-0 font-mono text-[10px] leading-none tracking-wider opacity-70"
    >
      {children}
    </span>
  );
}

/**
 * Chọn ngôn ngữ.
 *
 * English để VÔ HIỆU, có chủ đích: dự án chưa có i18n nào — `layout.tsx` ghim
 * `lang="vi"` và mọi chuỗi đều viết thẳng tiếng Việt trong code. Một dropdown chọn
 * được English mà bấm vào không đổi gì là UI nói dối, cùng loại lỗi mà header này
 * đã tránh ở hai chỗ khác: nav là `span` chứ không phải link ("hứa một tính năng
 * không tồn tại"), và nút Đăng nhập `disabled` kèm `title` nói rõ vì sao.
 *
 * Khi có bản dịch thật thì bỏ `disabled` và nối `onValueChange` vào i18n — phần
 * hiển thị ở đây không phải sửa gì.
 */
export function LanguageSelect() {
  // Controlled ở "vi" và KHÔNG có `onValueChange`: mục duy nhất bấm được cũng chính
  // là giá trị đang chọn, nên không có gì để đổi. Thêm handler ở đây là dựng một
  // đường thay đổi trạng thái không bao giờ chạy.
  return (
    <Select value="vi">
      {/*
        Trigger chỉ có icon dịch, không có chữ "Tiếng Việt" như trước: header là một
        hàng flex chật, và ở mobile trigger này còn phải nằm ngoài panel hamburger cạnh
        logo — chỗ chỉ vừa cho một ô vuông. Tên ngôn ngữ đang dùng vì thế chuyển sang
        `title` (chuột) và `aria-label` (screen reader), cộng với dòng được tô kín trong
        danh sách khi mở ra.
      */}
      <HeaderSelectTrigger aria-label="Ngôn ngữ: Tiếng Việt" title="Ngôn ngữ: Tiếng Việt">
        <Languages aria-hidden className="size-4.5" />
      </HeaderSelectTrigger>
      {/* `popper` thay cho mặc định `item-aligned` — xem chú thích cùng chỗ trong
          `theme-select.tsx`: item-aligned tính toạ độ sai trong header `sticky` và
          menu rơi về góc trên-trái viewport. */}
      <SelectContent position="popper" align="end" sideOffset={6}>
        {/*
          `selected="fill"` — dòng đang chọn tô kín màu primary thay cho dấu tick ở lề
          phải. Trigger đã là icon-only nên danh sách là chỗ DUY NHẤT nói được đang
          dùng ngôn ngữ nào; một dấu tick 16px là tín hiệu quá yếu cho việc đó.
        */}
        {/*
          `textValue` khai tay vì có chip: Radix lấy chuỗi typeahead từ `textContent`
          của `ItemText`, mà nó bây giờ bắt đầu bằng "vn" — không khai thì gõ "t" không
          nhảy tới được dòng này. (Cờ SVG trước đây không gây ra chuyện đó vì svg không
          có text.)
        */}
        <SelectItem value="vi" selected="fill" textValue="Tiếng Việt">
          <Code>vn</Code>
          Tiếng Việt
        </SelectItem>
        {/*
          `disabled` + chữ "sắp có" ngay trong nhãn: một dòng bị mờ mà không nói vì
          sao thì người dùng sẽ bấm lại vài lần rồi nghĩ giao diện hỏng.
        */}
        <SelectItem value="en" selected="fill" textValue="English" disabled>
          <Code>us</Code>
          English
          <span className="text-muted-foreground">· sắp có</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
