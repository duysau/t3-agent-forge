import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStickToBottom } from "./use-stick-to-bottom";

/**
 * jsdom không tự tính layout: `scrollHeight` và `clientHeight` luôn là 0, và
 * `scrollTop` là một thuộc tính ghi được bình thường. Nên fake chiều cao bằng
 * `defineProperty` rồi đọc `scrollTop` là cách duy nhất kiểm được hành vi cuộn ở
 * đây — và cũng đủ, vì logic cần kiểm là số học, không phải layout.
 */
function fakeHeights(el: HTMLElement, scrollHeight: number, clientHeight: number): void {
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
}

function Box({ signal }: { signal: string }) {
  const ref = useStickToBottom<HTMLDivElement>(signal);
  return <div ref={ref} data-testid="box" />;
}

describe("useStickToBottom", () => {
  it("nội dung mới thì kéo xuống đáy", () => {
    const { getByTestId, rerender } = render(<Box signal="1" />);
    const box = getByTestId("box");
    fakeHeights(box, 1000, 380);

    rerender(<Box signal="2" />);

    expect(box.scrollTop).toBe(1000);
  });

  /**
   * Kéo người dùng xuống đáy trong lúc họ đang cuộn lên đọc lại đoạn trước là mất
   * chỗ đang đọc — và trong một cuộc gọi voice, transcript chảy liên tục nên họ sẽ
   * bị giật xuống mỗi vài giây, không đọc nổi câu nào.
   */
  it("người dùng đã cuộn lên đọc lại thì KHÔNG kéo họ xuống", () => {
    const { getByTestId, rerender } = render(<Box signal="1" />);
    const box = getByTestId("box");
    fakeHeights(box, 1000, 380);

    box.scrollTop = 100; // còn cách đáy 520px
    box.dispatchEvent(new Event("scroll"));
    rerender(<Box signal="2" />);

    expect(box.scrollTop).toBe(100);
  });

  it("đang ở gần đáy thì vẫn kéo xuống — người dùng vẫn đang theo dõi", () => {
    const { getByTestId, rerender } = render(<Box signal="1" />);
    const box = getByTestId("box");
    fakeHeights(box, 1000, 380);

    box.scrollTop = 600; // còn cách đáy 20px
    box.dispatchEvent(new Event("scroll"));
    rerender(<Box signal="2" />);

    expect(box.scrollTop).toBe(1000);
  });

  it("cuộn lên rồi quay lại đáy thì dán lại", () => {
    const { getByTestId, rerender } = render(<Box signal="1" />);
    const box = getByTestId("box");
    fakeHeights(box, 1000, 380);

    box.scrollTop = 0;
    box.dispatchEvent(new Event("scroll"));
    rerender(<Box signal="2" />);
    expect(box.scrollTop).toBe(0);

    box.scrollTop = 620; // về đúng đáy
    box.dispatchEvent(new Event("scroll"));
    rerender(<Box signal="3" />);

    expect(box.scrollTop).toBe(1000);
  });

  it("signal không đổi thì không đụng tới scrollTop", () => {
    const { getByTestId, rerender } = render(<Box signal="1" />);
    const box = getByTestId("box");
    fakeHeights(box, 1000, 380);
    box.scrollTop = 250;

    rerender(<Box signal="1" />);

    expect(box.scrollTop).toBe(250);
  });
});
