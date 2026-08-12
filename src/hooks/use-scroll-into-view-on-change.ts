"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Kéo phần tử lên đầu tầm nhìn mỗi khi `signal` đổi — dùng cho việc chuyển bước
 * trong wizard.
 *
 * Vì sao cần: mỗi bước của wizard là một panel dài (danh sách trang đã crawl, 20
 * bài kiểm định…), nên khi bấm "Tiếp tục" người dùng đang ở tận cuối trang. Bước
 * mới render ở TRÊN vị trí đó, và trình duyệt giữ nguyên chỗ cuộn — người dùng nhìn
 * vào một vùng trống hoặc chân trang, tưởng cú bấm không có tác dụng.
 *
 * KHÔNG cuộn ở lượt render đầu: người dùng có thể vừa mở link neo tới `#studio`,
 * hoặc đang đọc dở phần khác của trang.
 *
 * Phần tử nhận ref nên có `scroll-mt-*` để chừa chỗ cho header `sticky` — nếu không,
 * header phủ mất đúng cái tiêu đề vừa được cuộn tới.
 */
export function useScrollIntoViewOnChange<T extends HTMLElement>(
  signal: unknown,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  // Giá trị của lượt render trước. Khởi tạo bằng chính `signal` để lượt đầu tiên
  // không đếm là "đã đổi".
  const previous = useRef(signal);

  useEffect(() => {
    if (previous.current === signal) return;
    previous.current = signal;

    // Người tắt animation ở hệ điều hành thường tắt vì chuyển động gây chóng mặt —
    // cuộn mượt là đúng loại chuyển động đó. Nhảy thẳng vẫn tới đúng chỗ.
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    ref.current?.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [signal]);

  return ref;
}
