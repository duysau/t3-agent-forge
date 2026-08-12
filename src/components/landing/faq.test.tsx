import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FAQS, Faq } from "./faq";

describe("Faq", () => {
  it("hiện đủ mọi câu hỏi trong FAQS", () => {
    render(<Faq />);
    for (const item of FAQS) {
      expect(screen.getByText(item.q)).toBeInTheDocument();
    }
  });

  it("câu trả lời nằm sẵn trong DOM, không chờ mở accordion", () => {
    /*
      Điểm mấu chốt của việc dùng `<details>` thay vì accordion điều khiển bằng
      state: nội dung trả lời có mặt trong HTML tĩnh kể cả khi đang đóng, nên
      crawler đọc được mà không cần chạy JS — đó là lý do khối này đủ tư cách
      cho rich result `FAQPage`. Một accordion render có điều kiện sẽ phá đúng
      tính chất đó mà nhìn bằng mắt thì không thấy khác gì.
    */
    render(<Faq />);
    for (const item of FAQS) {
      expect(screen.getByText(item.a)).toBeInTheDocument();
    }
  });

  it("mỗi câu hỏi là một <summary> bấm/tab được, không phải div trơn", () => {
    const { container } = render(<Faq />);
    const summaries = container.querySelectorAll("details > summary");
    expect(summaries).toHaveLength(FAQS.length);
  });
});
