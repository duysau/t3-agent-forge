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
});
