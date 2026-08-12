import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LanguageSelect } from "./language-select";

describe("LanguageSelect", () => {
  /**
   * Trigger chỉ có ICON, không có chữ "Tiếng Việt" như trước: ở mobile nút này nằm
   * ngoài panel hamburger, cạnh logo — chỗ chỉ vừa một ô vuông 44px. Nhưng icon-only
   * thì tên phải nằm ở chỗ khác: `title` cho người dùng chuột, `aria-label` cho
   * screen reader (chính `aria-label` đó là cái query dưới đây tìm ra).
   */
  it("trigger là icon-only nhưng vẫn nói được đang dùng ngôn ngữ nào", () => {
    render(<LanguageSelect />);

    const trigger = screen.getByRole("combobox", { name: /ngôn ngữ/i });
    expect(trigger).toHaveAttribute("title", expect.stringContaining("Tiếng Việt"));
    // Không còn chữ nào trong trigger — nếu có, nó lại chiếm chỗ như trước.
    expect(trigger).not.toHaveTextContent(/Tiếng Việt|English/);
  });

  /**
   * Đúng MỘT svg: icon dịch, không có mũi xuống. Mũi xuống ngốn 20px trên một nút 44px
   * mà không nói thêm gì so với icon + `title`.
   */
  it("trigger không có mũi xuống", () => {
    render(<LanguageSelect />);

    const trigger = screen.getByRole("combobox", { name: /ngôn ngữ/i });
    expect(trigger.querySelectorAll("svg")).toHaveLength(1);
  });

  it("mở ra thì thấy cả hai ngôn ngữ", async () => {
    render(<LanguageSelect />);

    await userEvent.click(screen.getByRole("combobox", { name: /ngôn ngữ/i }));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("Tiếng Việt"),
      expect.stringContaining("English"),
    ]);
  });

  /**
   * English phải để VÔ HIỆU, và đây là quyết định có chủ đích: dự án chưa có i18n
   * nào — `layout.tsx` ghim `lang="vi"` và mọi chuỗi đều viết thẳng tiếng Việt. Một
   * dropdown chọn được English mà bấm vào không đổi gì là UI nói dối, cùng loại lỗi
   * mà header này đã tránh ở hai chỗ khác (nav là `span` chứ không phải link, nút
   * Đăng nhập `disabled` kèm `title` nói vì sao).
   */
  it("English bị vô hiệu vì chưa có bản dịch, và nói rõ vì sao", async () => {
    render(<LanguageSelect />);

    await userEvent.click(screen.getByRole("combobox", { name: /ngôn ngữ/i }));

    const english = await screen.findByRole("option", { name: /English/ });
    expect(english).toHaveAttribute("aria-disabled", "true");
    expect(english).toHaveTextContent(/sắp có|chưa/i);
  });

  /**
   * Mã quốc gia là chữ nhìn được, nhưng KHÔNG được chen vào tên đọc lên: `name` khớp
   * chính xác "Tiếng Việt" chỉ đúng khi chip "vn" bị `aria-hidden`. Nếu chip lọt vào
   * accessible name thì tên thành "vn Tiếng Việt" và query này fail.
   */
  it("mã quốc gia hiện ra nhưng không chen vào tên được đọc", async () => {
    render(<LanguageSelect />);

    await userEvent.click(screen.getByRole("combobox", { name: /ngôn ngữ/i }));

    const vi = await screen.findByRole("option", { name: "Tiếng Việt" });
    expect(vi).toHaveTextContent("vn");
  });

  /**
   * `textValue` phải khai tay khi có chip: Radix lấy typeahead từ `textContent` của
   * `ItemText`, mà textContent bây giờ bắt đầu bằng "vn" — không khai thì gõ "t" không
   * còn nhảy tới "Tiếng Việt" nữa. Cờ SVG trước đây không gây ra chuyện này vì svg
   * không có text.
   */
  it("gõ chữ đầu của tên ngôn ngữ vẫn nhảy tới đúng dòng", async () => {
    render(<LanguageSelect />);

    await userEvent.click(screen.getByRole("combobox", { name: /ngôn ngữ/i }));
    await screen.findByRole("option", { name: "Tiếng Việt" });
    await userEvent.keyboard("t");

    expect(screen.getByRole("option", { name: "Tiếng Việt" })).toHaveFocus();
  });
});

/**
 * Cùng lý do với `ThemeSelect`: mặc định `item-aligned` của `SelectContent` tính toạ
 * độ sai trong header `sticky` và menu rơi về góc trên-trái viewport.
 */
describe("LanguageSelect neo menu", () => {
  it("dùng chế độ popper thay cho item-aligned", async () => {
    render(<LanguageSelect />);

    await userEvent.click(screen.getByRole("combobox", { name: /ngôn ngữ/i }));

    expect(document.querySelector("[data-position]")).toHaveAttribute("data-position", "popper");
  });
});
