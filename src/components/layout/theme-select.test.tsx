import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { describe, expect, it } from "vitest";
import { ThemeSelect } from "./theme-select";

function renderSelect() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ThemeSelect />
    </ThemeProvider>,
  );
}

describe("ThemeSelect", () => {
  /**
   * Trigger phải tồn tại NGAY lượt render đầu, kể cả khi chưa biết theme thật (theme
   * chỉ đọc được ở trình duyệt). Trả `null` chờ mounted làm header co lại rồi giãn ra
   * khi JS chạy xong — một cú nhảy layout ngay trên thanh điều hướng.
   */
  it("luôn giữ chỗ trong header, kể cả trước khi biết theme", () => {
    renderSelect();

    expect(screen.getByRole("combobox", { name: /giao diện/i })).toBeInTheDocument();
  });

  /**
   * Ba lựa chọn, không phải hai: nút bật/tắt cũ KHÔNG có đường nào quay về "theo hệ
   * thống" — một khi người dùng bấm nó, lựa chọn của hệ điều hành bị ghi đè vĩnh viễn
   * trong localStorage.
   */
  it("có đủ ba lựa chọn kể cả theo hệ thống", async () => {
    renderSelect();

    await userEvent.click(screen.getByRole("combobox", { name: /giao diện/i }));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Sáng", "Tối", "Theo hệ thống"]);
  });

  it("chọn Tối thì đổi giao diện sang tối", async () => {
    renderSelect();

    await userEvent.click(screen.getByRole("combobox", { name: /giao diện/i }));
    await userEvent.click(await screen.findByRole("option", { name: "Tối" }));

    expect(document.documentElement).toHaveClass("dark");
  });

  it("chọn Sáng lại thì quay về sáng", async () => {
    renderSelect();

    await userEvent.click(screen.getByRole("combobox", { name: /giao diện/i }));
    await userEvent.click(await screen.findByRole("option", { name: "Tối" }));
    await userEvent.click(screen.getByRole("combobox", { name: /giao diện/i }));
    await userEvent.click(await screen.findByRole("option", { name: "Sáng" }));

    expect(document.documentElement).not.toHaveClass("dark");
  });

  /**
   * Trigger chỉ có ICON, không có chữ: "Theo hệ thống" trên thanh header ngốn ~110px
   * và đẩy nav sang ngắt dòng (đã xảy ra thật). Nhưng icon-only thì tên phải nằm ở
   * chỗ khác — `title` cho người dùng chuột, `aria-label` cho screen reader.
   */
  it("trigger là icon-only nhưng vẫn nói được đang bật cái nào", async () => {
    renderSelect();

    await userEvent.click(screen.getByRole("combobox", { name: /giao diện/i }));
    await userEvent.click(await screen.findByRole("option", { name: "Tối" }));

    const trigger = screen.getByRole("combobox", { name: /giao diện/i });
    expect(trigger).toHaveAttribute("title", expect.stringContaining("Tối"));
    // Không còn chữ nào trong trigger — nếu có, nó lại chiếm chỗ như trước.
    expect(trigger).not.toHaveTextContent(/Tối|Sáng|hệ thống/);
  });
});

/**
 * Menu phải neo bằng `position="popper"`, KHÔNG phải mặc định `item-aligned` của
 * `SelectContent`.
 *
 * `item-aligned` cố đặt đúng mục đang chọn lên trên trigger bằng toạ độ tuyệt đối
 * tính từ rect của trigger — trong một header `sticky` nó tính sai và menu rơi về góc
 * trên-trái của viewport (đã thấy thật). `popper` neo bằng Floating UI: theo trigger
 * khi trang cuộn, và tự lật/né khi chạm biên.
 *
 * Test này không kiểm được toạ độ (jsdom không có layout) — nó chốt LỰA CHỌN chế độ
 * neo, thứ duy nhất kiểm được ở đây và cũng là thứ đã sai.
 */
describe("ThemeSelect neo menu", () => {
  it("dùng chế độ popper thay cho item-aligned", async () => {
    renderSelect();

    await userEvent.click(screen.getByRole("combobox", { name: /giao diện/i }));

    const viewport = document.querySelector("[data-position]");
    expect(viewport).toHaveAttribute("data-position", "popper");
  });
});
