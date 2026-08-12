"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Còn cách đáy bao nhiêu pixel thì vẫn coi là "đang theo dõi".
 *
 * Không phải 0: `scrollHeight - scrollTop - clientHeight` hiếm khi bằng đúng 0 sau
 * một lượt cuộn (trình duyệt làm tròn phân số pixel, và zoom/DPI làm lệch thêm),
 * nên một ngưỡng 0 sẽ khiến khung thoại thỉnh thoảng thôi tự cuộn mà không rõ lý do.
 * 64px xấp xỉ một bubble — đủ rộng để chịu sai số, đủ hẹp để không kéo người đang
 * đọc đoạn cũ xuống đáy.
 */
const NEAR_BOTTOM_PX = 64;

/**
 * Dán khung cuộn xuống đáy mỗi khi `signal` đổi, TRỪ khi người dùng đã tự cuộn lên.
 *
 * Vì sao cần: khung thoại của cả chat và voice là một vùng cao cố định
 * (`h-[380px] overflow-y-auto`), nên tin mới nằm NGOÀI vùng thấy được và người dùng
 * phải tự cuộn — trong một cuộc gọi voice, transcript chảy liên tục nên câu mới
 * gần như không bao giờ nhìn thấy.
 *
 * `signal` là một giá trị đổi khi nội dung đổi (ví dụ `"3:true"` từ số tin nhắn và
 * cờ đang gõ). Cố tình KHÔNG nhận mảng dep: một mảng trải vào `useEffect` khiến
 * `react-hooks/exhaustive-deps` không kiểm được nữa, và lint của dự án này chạy sạch.
 *
 * Không dùng `scrollIntoView`/`scrollTo({behavior:"smooth"})`: cuộn mượt trong lúc
 * transcript chảy liên tục là một chuỗi animation chồng nhau, và jsdom không có
 * `scrollTo` nên hành vi này sẽ không kiểm được bằng test.
 */
export function useStickToBottom<T extends HTMLElement>(signal: unknown): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  // Người dùng có đang theo dõi đáy không. Ref chứ không state: đổi giá trị này
  // KHÔNG được render lại — nó chỉ là ghi chú cho lần cuộn kế tiếp, và một
  // setState trong handler `scroll` là render mỗi frame khi người dùng cuộn.
  const following = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      following.current = distance <= NEAR_BOTTOM_PX;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el === null || !following.current) return;
    // Gán quá `scrollHeight` là hợp lệ — trình duyệt tự kẹp về vị trí đáy thật.
    el.scrollTop = el.scrollHeight;
  }, [signal]);

  return ref;
}
