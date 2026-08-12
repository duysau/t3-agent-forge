import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

/**
 * Hai prop này tồn tại cho các select icon-only trên thanh header. Điều kiện quan
 * trọng nhất của chúng là KHÔNG làm đổi select mặc định — mọi select trong form của
 * dự án đều dùng bản mặc định, và đó là thứ vỡ âm thầm nếu default đổi.
 */
function renderSelect(props?: {
  chevron?: boolean;
  selected?: "check" | "fill";
}) {
  return render(
    <Select value="a">
      <SelectTrigger aria-label="Thử" chevron={props?.chevron}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value="a" selected={props?.selected}>
          A
        </SelectItem>
        <SelectItem value="b" selected={props?.selected}>
          B
        </SelectItem>
      </SelectContent>
    </Select>,
  );
}

describe("SelectTrigger chevron", () => {
  it("mặc định vẫn có mũi xuống", () => {
    renderSelect();

    expect(screen.getByRole("combobox").querySelector("svg")).not.toBeNull();
  });

  it("chevron={false} thì không vẽ mũi xuống", () => {
    renderSelect({ chevron: false });

    expect(screen.getByRole("combobox").querySelector("svg")).toBeNull();
  });
});

describe("SelectItem selected", () => {
  it("mặc định đánh dấu bằng dấu tick", async () => {
    renderSelect();

    await userEvent.click(screen.getByRole("combobox"));

    const checked = await screen.findByRole("option", { name: "A" });
    expect(checked).toHaveAttribute("data-state", "checked");
    expect(checked.querySelector("svg")).not.toBeNull();
  });

  /**
   * `fill` bỏ hẳn dấu tick và tô kín cả dòng. Test chốt hai nửa: không còn svg nào
   * trong dòng (nửa "bỏ tick"), và class tô nền có mặt (nửa "tô kín" — jsdom không có
   * layout nên đây là thứ duy nhất kiểm được).
   */
  it("selected='fill' bỏ dấu tick và tô kín dòng đang chọn", async () => {
    renderSelect({ selected: "fill" });

    await userEvent.click(screen.getByRole("combobox"));

    const checked = await screen.findByRole("option", { name: "A" });
    expect(checked).toHaveAttribute("data-state", "checked");
    expect(checked.querySelector("svg")).toBeNull();
    expect(checked.className).toContain("data-[state=checked]:bg-primary");
  });

  /**
   * Nhánh `fill` KHÔNG được mang theo `**:text-accent-foreground` của nhánh `check`:
   * trên một dòng đã tô kín xanh, rule đó bắt mọi icon con đổi thành xanh đậm — xanh
   * đậm trên nền xanh đậm. Đây là lý do hai nhánh khai class riêng thay vì ghi đè.
   */
  it("selected='fill' không kéo theo rule đổi màu con của nhánh check", async () => {
    renderSelect({ selected: "fill" });

    await userEvent.click(screen.getByRole("combobox"));

    const checked = await screen.findByRole("option", { name: "A" });
    expect(checked.className).not.toContain("**:text-accent-foreground");
  });
});
