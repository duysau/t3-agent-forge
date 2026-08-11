import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatDemoView, type ChatViewProps } from "./chat-demo-view";

function props(over: Partial<ChatViewProps> = {}): ChatViewProps {
  return {
    messages: [],
    draft: "",
    onDraftChange: vi.fn(),
    onSend: vi.fn(),
    sending: false,
    error: null,
    suggested: [],
    onPickSuggested: vi.fn(),
    ...over,
  };
}

describe("ChatDemoView", () => {
  it("hiện các lượt hội thoại theo thứ tự", () => {
    render(
      <ChatDemoView
        {...props({
          messages: [
            { role: "user", content: "Giá bao nhiêu?" },
            { role: "assistant", content: "Dạ 350.000đ ạ." },
          ],
        })}
      />,
    );
    const bubbles = screen.getAllByTestId("chat-bubble");
    expect(bubbles.map((b) => b.textContent)).toEqual(["Giá bao nhiêu?", "Dạ 350.000đ ạ."]);
  });

  it("phân biệt bong bóng của khách và của bot", () => {
    render(
      <ChatDemoView
        {...props({
          messages: [
            { role: "user", content: "hỏi" },
            { role: "assistant", content: "đáp" },
          ],
        })}
      />,
    );
    const bubbles = screen.getAllByTestId("chat-bubble");
    expect(bubbles[0]!.className).not.toBe(bubbles[1]!.className);
  });

  it("draft rỗng thì nút gửi bị vô hiệu", () => {
    render(<ChatDemoView {...props({ draft: "   " })} />);
    expect(screen.getByRole("button", { name: /Gửi/ })).toBeDisabled();
  });

  it("có draft thì bấm gửi gọi onSend", async () => {
    const onSend = vi.fn();
    render(<ChatDemoView {...props({ draft: "Giá bao nhiêu?", onSend })} />);
    await userEvent.click(screen.getByRole("button", { name: /Gửi/ }));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("đang gửi thì vô hiệu ô nhập để không gửi chồng", () => {
    render(<ChatDemoView {...props({ draft: "x", sending: true })} />);
    expect(screen.getByPlaceholderText(/Nhập câu hỏi/)).toBeDisabled();
  });

  it("bấm câu hỏi gợi ý thì gọi onPickSuggested với đúng câu đó", async () => {
    const onPickSuggested = vi.fn();
    render(
      <ChatDemoView {...props({ suggested: ["Giá massage bao nhiêu?"], onPickSuggested })} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Giá massage bao nhiêu?" }));
    expect(onPickSuggested).toHaveBeenCalledWith("Giá massage bao nhiêu?");
  });

  it("lỗi hiện ra mà KHÔNG xoá hội thoại đang có", () => {
    render(
      <ChatDemoView
        {...props({
          messages: [{ role: "user", content: "câu cũ còn đây" }],
          error: "Backend không phản hồi",
        })}
      />,
    );
    expect(screen.getByText(/Backend không phản hồi/)).toBeInTheDocument();
    expect(screen.getByText("câu cũ còn đây")).toBeInTheDocument();
  });

  /**
   * Test này KHÔNG chứng minh ô nhập cao 46px hay cao hơn nút gửi 44px — jsdom không
   * áp stylesheet nào nên không có chiều cao nào để đo. Nó chứng minh đúng thứ đo
   * được và cũng đúng thứ đã hỏng: kết quả của twMerge. `h-9` (36px), `md:text-sm`
   * và bộ viền focus của base shadcn phải bị gỡ khỏi class cuối cùng — còn sót một
   * cái nào là style của prototype lại bị base đè, đúng như trước khi sửa.
   */
  it("class của base shadcn không còn đè lên ô nhập", () => {
    render(<ChatDemoView {...props()} />);
    const classes = screen.getByPlaceholderText(/Nhập câu hỏi/).className.split(/\s+/);

    for (const dead of [
      "h-9",
      "md:text-sm",
      "focus-visible:border-ring",
      "focus-visible:ring-3",
      "focus-visible:ring-ring/50",
    ]) {
      expect(classes).not.toContain(dead);
    }

    // Và giá trị theo prototype thật sự có mặt để quyết định hộp.
    for (const want of ["h-auto", "py-[11px]", "text-[14.5px]", "md:text-[14.5px]"]) {
      expect(classes).toContain(want);
    }
  });
});
