import { render, screen } from "@testing-library/react";
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
});
