import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
  it("variant success dùng token success, không phải primary", () => {
    render(<Badge variant="success">8 facts</Badge>);
    const el = screen.getByText("8 facts");
    expect(el.className).toContain("bg-success");
    expect(el.className).not.toContain("bg-primary");
  });

  it("variant warning dùng token warning — badge tụt hạng cần nó", () => {
    render(<Badge variant="warning">Dữ liệu mẫu</Badge>);
    expect(screen.getByText("Dữ liệu mẫu").className).toContain("bg-warning");
  });

  it("variant default vẫn còn nguyên sau khi ta thêm variant mới", () => {
    render(<Badge>Nháp</Badge>);
    expect(screen.getByText("Nháp").className).toContain("bg-primary");
  });

  it("giữ className truyền thêm", () => {
    render(<Badge className="ml-2">X</Badge>);
    expect(screen.getByText("X").className).toContain("ml-2");
  });
});
