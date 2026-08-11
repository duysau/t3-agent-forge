import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "./chat-demo-view";
import { ChatDemo } from "./chat-demo";

interface ChatSendInput {
  slug: string;
  message: string;
  history: ChatMessage[];
}
interface ChatSendOutput {
  reply: string;
}

const { sendMutation } = vi.hoisted(() => ({
  sendMutation: {
    mutateAsync: vi.fn<(input: ChatSendInput) => Promise<ChatSendOutput>>(),
    isPending: false,
  },
}));

vi.mock("~/trpc/react", () => ({
  api: {
    chat: {
      send: { useMutation: () => sendMutation },
    },
  },
}));

describe("ChatDemo", () => {
  beforeEach(() => {
    sendMutation.mutateAsync.mockReset();
  });

  it("history gửi lên không chứa câu hỏi đang gửi", async () => {
    sendMutation.mutateAsync
      .mockResolvedValueOnce({ reply: "Trả lời 1" })
      .mockResolvedValueOnce({ reply: "Trả lời 2" });

    render(<ChatDemo slug="demo-agent" suggested={[]} />);

    await userEvent.type(screen.getByPlaceholderText(/Nhập câu hỏi/), "Câu 1");
    await userEvent.click(screen.getByRole("button", { name: /Gửi/ }));
    expect(await screen.findByText("Trả lời 1")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/Nhập câu hỏi/), "Câu 2");
    await userEvent.click(screen.getByRole("button", { name: /Gửi/ }));
    expect(await screen.findByText("Trả lời 2")).toBeInTheDocument();

    expect(sendMutation.mutateAsync).toHaveBeenCalledTimes(2);
    const secondCallInput = sendMutation.mutateAsync.mock.calls[1]![0];
    expect(secondCallInput).toEqual({
      slug: "demo-agent",
      message: "Câu 2",
      history: [
        { role: "user", content: "Câu 1" },
        { role: "assistant", content: "Trả lời 1" },
      ],
    });
    expect(secondCallInput.history.some((m) => m.content === "Câu 2")).toBe(false);
  });

  it("lỗi thì hiện thông báo nhưng vẫn giữ hội thoại đang có", async () => {
    sendMutation.mutateAsync.mockRejectedValueOnce(new Error("Backend không phản hồi"));

    render(<ChatDemo slug="demo-agent" suggested={[]} />);

    await userEvent.type(screen.getByPlaceholderText(/Nhập câu hỏi/), "Câu lỗi");
    await userEvent.click(screen.getByRole("button", { name: /Gửi/ }));

    expect(await screen.findByText(/Backend không phản hồi/)).toBeInTheDocument();
    expect(screen.getByText("Câu lỗi")).toBeInTheDocument();
  });

  it("câu hỏi gợi ý biến mất ngay khi hội thoại bắt đầu", async () => {
    sendMutation.mutateAsync.mockResolvedValueOnce({ reply: "Trả lời 1" });

    render(<ChatDemo slug="demo-agent" suggested={["Giá massage bao nhiêu?"]} />);

    expect(screen.getByRole("button", { name: "Giá massage bao nhiêu?" })).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/Nhập câu hỏi/), "Câu 1");
    await userEvent.click(screen.getByRole("button", { name: /Gửi/ }));
    expect(await screen.findByText("Trả lời 1")).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Giá massage bao nhiêu?" }),
    ).not.toBeInTheDocument();
  });
});
