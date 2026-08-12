"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem } from "~/components/ui/select";
import { HeaderSelectTrigger } from "./header-select-trigger";

/**
 * Ba lựa chọn, dùng cho CẢ danh sách và icon trên trigger — một nguồn duy nhất, nên
 * không thể xảy ra chuyện thêm lựa chọn mới mà trigger không biết vẽ icon cho nó.
 */
const OPTIONS = [
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
  { value: "system", label: "Theo hệ thống", icon: Monitor },
] as const;

/**
 * Chọn giao diện sáng / tối / theo hệ thống.
 *
 * Ba lựa chọn, không phải hai: nút bật-tắt trước đây KHÔNG có đường nào quay về "theo
 * hệ thống" — bấm một lần là lựa chọn của hệ điều hành bị ghi đè vĩnh viễn trong
 * localStorage, và người dùng không có cách nào lấy lại ngoài việc xoá site data.
 *
 * `mounted` không phải phòng xa suông: theme thật chỉ biết được ở trình duyệt
 * (localStorage hoặc `prefers-color-scheme`), nên render theo `theme` ngay lượt đầu
 * sẽ cho HTML server khác HTML client — đúng định nghĩa hydration mismatch. Trước khi
 * mounted vẫn render ĐỦ trigger (chỉ hiện nhãn mặc định) thay vì `return null`: trả
 * null làm header co lại rồi giãn ra khi JS chạy xong, một cú nhảy layout ngay trên
 * thanh điều hướng.
 */
export function ThemeSelect() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  // Luôn là một chuỗi, không bao giờ `undefined`: đổi từ `undefined` sang chuỗi biến
  // Select từ uncontrolled thành controlled giữa hai lượt render — React cảnh báo và
  // Radix mất trạng thái. "system" là mặc định thật của `ThemeProvider`, nên lượt
  // render đầu ở server và ở client khớp nhau.
  const value = mounted ? (theme ?? "system") : "system";
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[2];
  const CurrentIcon = current.icon;

  return (
    <Select value={value} onValueChange={setTheme}>
      {/*
        Trigger chỉ có ICON, không chữ. Header là một hàng flex chật: "Theo hệ thống"
        trên trigger ngốn ~110px và đã đẩy nav sang ngắt dòng giữa chữ ("Sản / phẩm")
        ở ~1320px. Tên vẫn phải nói được — nên nó nằm ở `title` (chuột) và
        `aria-label` (screen reader), không mất đi đâu cả.
      */}
      <HeaderSelectTrigger
        aria-label={`Giao diện: ${current.label}`}
        title={`Giao diện: ${current.label}`}
      >
        {/* KHÔNG dùng `SelectValue`: nó vẽ lại nguyên children của item đang chọn,
            tức cả dòng chữ. Vẽ đúng icon của lựa chọn hiện tại là cách duy nhất giữ
            trigger hẹp mà vẫn cho biết đang ở chế độ nào. */}
        <CurrentIcon aria-hidden className="size-4.5" />
      </HeaderSelectTrigger>
      {/*
        `popper` + `align="end"`, KHÔNG dùng mặc định `item-aligned` của
        `SelectContent`: chế độ đó cố đặt mục đang chọn lên trên trigger bằng toạ độ
        tuyệt đối tính từ rect của trigger, và trong header `sticky` nó tính sai — menu
        rơi hẳn về góc trên-trái viewport. `popper` neo bằng Floating UI nên theo đúng
        trigger, tự lật khi chạm biên; `align="end"` vì trigger nằm sát lề phải.
      */}
      <SelectContent position="popper" align="end" sideOffset={6}>
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            /*
              `selected="fill"` — dòng đang chọn tô kín màu primary thay cho dấu tick ở
              lề phải. Trigger là icon-only nên danh sách là chỗ DUY NHẤT nói bằng CHỮ
              đang bật chế độ nào; một dấu tick 16px là tín hiệu quá yếu cho việc đó.
            */
            <SelectItem key={option.value} value={option.value} selected="fill">
              <Icon aria-hidden className="size-4" />
              {option.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
