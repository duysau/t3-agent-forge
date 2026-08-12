import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { describe, expect, it } from "vitest";
import { ThemeToggle } from "./theme-toggle";

function renderToggle() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  it("luôn giữ chỗ trong header, kể cả trước khi biết theme", () => {
    // Nút phải TỒN TẠI ngay lượt render đầu (dù chưa vẽ icon) — trả null sẽ làm
    // header co lại rồi giãn ra khi JS chạy xong, đúng một cú nhảy layout.
    renderToggle();
    expect(screen.getByRole("button", { name: /giao diện/i })).toBeInTheDocument();
  });

  it("bấm thì bật sang tối, và nhãn nói hành động kế tiếp", async () => {
    const user = userEvent.setup();
    renderToggle();

    const btn = await screen.findByRole("button", { name: /Chuyển sang giao diện tối/ });
    await user.click(btn);

    // Sau khi sang tối, nhãn phải mời quay lại sáng — nhãn mô tả HÀNH ĐỘNG sắp
    // xảy ra, không phải trạng thái hiện tại.
    expect(
      await screen.findByRole("button", { name: /Chuyển sang giao diện sáng/ }),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("bấm lần nữa thì về sáng", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(await screen.findByRole("button", { name: /giao diện tối/ }));
    await user.click(await screen.findByRole("button", { name: /giao diện sáng/ }));

    expect(document.documentElement).not.toHaveClass("dark");
  });
});
