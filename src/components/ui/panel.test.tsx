import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel, PanelBody, PanelFoot, PanelSub, PanelTitle } from "./panel";

describe("Panel", () => {
  it("ghép đủ tiêu đề, mô tả, thân và chân", () => {
    render(
      <Panel>
        <PanelBody>
          <PanelTitle>Nguồn dữ liệu</PanelTitle>
          <PanelSub>Dán link website</PanelSub>
          <p>thân</p>
        </PanelBody>
        <PanelFoot>chân</PanelFoot>
      </Panel>,
    );
    expect(screen.getByRole("heading", { name: "Nguồn dữ liệu" })).toBeInTheDocument();
    expect(screen.getByText("Dán link website")).toBeInTheDocument();
    expect(screen.getByText("thân")).toBeInTheDocument();
    expect(screen.getByText("chân")).toBeInTheDocument();
  });

  it("nhận thêm className mà không mất class gốc", () => {
    const { container } = render(<Panel className="mt-9">x</Panel>);
    const el = container.firstElementChild!;
    expect(el.className).toContain("mt-9");
    expect(el.className).toContain("rounded-2xl");
  });

  it("tiêu đề là heading thật để screen reader nhảy được", () => {
    render(<PanelTitle>Chọn sản phẩm</PanelTitle>);
    expect(screen.getByRole("heading", { name: "Chọn sản phẩm" })).toBeInTheDocument();
  });
});
