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

  it("lang toggle đánh dấu tiếng Việt đang bật", () => {
    render(<SiteHeader />);
    expect(screen.getByText("VIE")).toBeInTheDocument();
    expect(screen.getByText("ENG")).toBeInTheDocument();
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
