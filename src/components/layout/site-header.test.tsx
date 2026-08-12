import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("hiện brand và phụ đề", () => {
    render(<SiteHeader />);
    expect(screen.getByText("AgentForge")).toBeInTheDocument();
    expect(screen.getByText(/FPT Smart Cloud/)).toBeInTheDocument();
  });

  it("hiện đủ năm mục nav", () => {
    render(<SiteHeader />);
    for (const label of ["Sản phẩm", "Giải pháp", "Bảng giá", "Tài liệu", "Về FPT.AI"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("mục nav KHÔNG phải link — chưa có trang nào để dẫn tới", () => {
    render(<SiteHeader />);
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Dùng thử miễn phí"]);
  });

  it("CTA dẫn tới khu studio", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: /Dùng thử miễn phí/ })).toHaveAttribute("href", "#studio");
  });

  it("Đăng nhập bị vô hiệu vì chưa có auth, và nói rõ vì sao", () => {
    render(<SiteHeader />);
    const login = screen.getByRole("button", { name: /Đăng nhập/ });
    expect(login).toBeDisabled();
    expect(login).toHaveAttribute("title", expect.stringContaining("chưa"));
  });

  /**
   * "VIE | ENG" (chữ tĩnh) và nút bật-tắt sáng/tối đã được thay bằng hai dropdown.
   * Hành vi của từng cái nằm trong `language-select.test.tsx` và
   * `theme-select.test.tsx`; ở đây chỉ chốt việc header có đủ hai điều khiển đó.
   */
  it("có dropdown ngôn ngữ và dropdown giao diện", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("combobox", { name: /ngôn ngữ/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /giao diện/i })).toBeInTheDocument();
  });

  /**
   * Hai dropdown cài đặt phải nằm NGOÀI `#header-controls` — khối duy nhất bị
   * `display:none` khi menu đóng ở màn hẹp. Nằm trong đó nghĩa là ở mobile muốn đổi
   * ngôn ngữ hay sáng/tối thì phải mở menu trước: ba lần chạm cho một việc
   * làm-rồi-xong, mà lại là hai việc hay dùng nhất trên mobile.
   *
   * Đây là điều kiện KHÔNG kiểm được bằng bề ngoài (jsdom không có layout, và ở
   * jsdom không có media query nào áp dụng), nhưng kiểm được bằng cây DOM.
   */
  it("hai dropdown cài đặt không nằm trong khối bị gập vào menu", () => {
    render(<SiteHeader />);

    const collapsed = screen.getByTestId("header-controls");
    expect(collapsed).not.toContainElement(screen.getByRole("combobox", { name: /ngôn ngữ/i }));
    expect(collapsed).not.toContainElement(screen.getByRole("combobox", { name: /giao diện/i }));
  });

  describe("menu mobile", () => {
    it("bắt đầu ở trạng thái đóng", () => {
      render(<SiteHeader />);
      expect(screen.getByRole("button", { name: /Mở menu/ })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("bấm hamburger thì mở, bấm lại thì đóng", async () => {
      const user = userEvent.setup();
      render(<SiteHeader />);

      await user.click(screen.getByRole("button", { name: /Mở menu/ }));
      expect(screen.getByRole("button", { name: /Đóng menu/ })).toHaveAttribute(
        "aria-expanded",
        "true",
      );

      await user.click(screen.getByRole("button", { name: /Đóng menu/ }));
      expect(screen.getByRole("button", { name: /Mở menu/ })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("nút hamburger trỏ tới đúng khối nó điều khiển", () => {
      render(<SiteHeader />);
      const toggle = screen.getByRole("button", { name: /Mở menu/ });
      const controls = screen.getByTestId("header-controls");
      expect(toggle).toHaveAttribute("aria-controls", controls.id);
    });

    it("bấm CTA thì đóng menu — nếu không, panel che mất chỗ vừa nhảy tới", async () => {
      const user = userEvent.setup();
      render(<SiteHeader />);

      await user.click(screen.getByRole("button", { name: /Mở menu/ }));
      await user.click(screen.getByRole("link", { name: /Dùng thử miễn phí/ }));

      expect(screen.getByRole("button", { name: /Mở menu/ })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("Esc đóng menu và trả focus về nút đã mở nó", async () => {
      const user = userEvent.setup();
      render(<SiteHeader />);

      await user.click(screen.getByRole("button", { name: /Mở menu/ }));
      await user.keyboard("{Escape}");

      const toggle = screen.getByRole("button", { name: /Mở menu/ });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(toggle).toHaveFocus();
    });

    // Mở menu KHÔNG được nhân đôi CTA: hai <a href="#studio"> cùng tên là hai mục
    // trùng nhau trong danh sách link của screen reader.
    it("CTA vẫn là link duy nhất kể cả khi menu đang mở", async () => {
      const user = userEvent.setup();
      render(<SiteHeader />);

      await user.click(screen.getByRole("button", { name: /Mở menu/ }));

      const links = screen.getAllByRole("link");
      expect(links.map((a) => a.textContent)).toEqual(["Dùng thử miễn phí"]);
    });
  });
});

/**
 * Header là MỘT hàng flex chứa logo + nav + bốn điều khiển. Thêm hai dropdown vào là
 * hàng đó vượt trần và nav bắt đầu ngắt dòng giữa chữ ("Sản / phẩm") — đã xảy ra
 * thật ở ~1320px. Hai điều kiện dưới đây là thứ giữ cho nó không tái diễn.
 */
describe("SiteHeader bố cục một hàng", () => {
  it("không mục nav nào được phép ngắt dòng", () => {
    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: /Điều hướng chính/ });
    expect(nav.className).toMatch(/whitespace-nowrap/);
  });

  /**
   * Nav là nhóm rộng nhất mà cũng ít giá trị nhất — mấy mục đó là `span`, chưa dẫn
   * tới trang nào. Nên khi hết chỗ, nav biến mất TRƯỚC các điều khiển thật, và ngưỡng
   * đó phải cao hơn 900px (ngưỡng gập cả nhóm điều khiển vào panel).
   */
  it("nav chỉ hiện ở màn đủ rộng, cao hơn ngưỡng gập panel 900px", () => {
    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: /Điều hướng chính/ });
    const breakpoint = /min-\[(\d+)px\]:flex/.exec(nav.className)?.[1];
    expect(Number(breakpoint)).toBeGreaterThan(900);
  });
});
