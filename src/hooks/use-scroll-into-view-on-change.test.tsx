import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollIntoViewOnChange } from "./use-scroll-into-view-on-change";

function Box({ signal }: { signal: number }) {
  const ref = useScrollIntoViewOnChange<HTMLDivElement>(signal);
  return <div ref={ref} data-testid="box" />;
}

let scrollIntoView: ReturnType<typeof vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>>;

beforeEach(() => {
  // jsdom không có `scrollIntoView` thật (src/test/setup.ts gắn một no-op), nên
  // thay bằng spy để đọc được cả việc CÓ gọi hay không và gọi với tuỳ chọn nào.
  scrollIntoView = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>();
  Element.prototype.scrollIntoView = scrollIntoView;
});

describe("useScrollIntoViewOnChange", () => {
  /**
   * Lượt render đầu KHÔNG được cuộn. Người dùng có thể vừa mở link neo tới giữa
   * trang, hoặc đang đọc dở phần khác — kéo họ đi ngay khi trang mount là giành lấy
   * quyền điều khiển mà họ không yêu cầu.
   */
  it("lượt render đầu không cuộn gì", () => {
    render(<Box signal={1} />);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("signal đổi thì kéo phần tử lên đầu tầm nhìn", () => {
    const { rerender } = render(<Box signal={1} />);

    rerender(<Box signal={2} />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "start", behavior: "smooth" }),
    );
  });

  it("signal không đổi thì không cuộn", () => {
    const { rerender } = render(<Box signal={1} />);

    rerender(<Box signal={1} />);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("đổi nhiều lần thì cuộn mỗi lần", () => {
    const { rerender } = render(<Box signal={1} />);

    rerender(<Box signal={2} />);
    rerender(<Box signal={3} />);

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  /**
   * Người đã tắt animation ở hệ điều hành thường tắt vì chuyển động gây chóng mặt
   * hoặc buồn nôn — cuộn mượt là đúng loại chuyển động đó. Nhảy thẳng vẫn tới đúng
   * chỗ, chỉ không có hành trình.
   */
  it("người tắt animation thì nhảy thẳng, không cuộn mượt", () => {
    window.matchMedia = ((query: string) =>
      ({
        media: query,
        matches: query.includes("prefers-reduced-motion"),
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;

    const { rerender } = render(<Box signal={1} />);
    rerender(<Box signal={2} />);

    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "auto" }),
    );
  });
});
