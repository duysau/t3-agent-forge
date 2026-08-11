"use client";

import { Bot, Send, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatViewProps {
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  error: string | null;
  suggested: string[];
  onPickSuggested: (q: string) => void;
}

export function ChatDemoView(p: ChatViewProps) {
  return (
    <div className="flex flex-col">
      <div className="flex h-[380px] flex-col gap-3.5 overflow-y-auto bg-gray-25 p-5">
        {p.messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={`${i}-${m.role}`}
              className={cn("flex max-w-[82%] gap-2.5", isUser && "flex-row-reverse self-end")}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                  isUser ? "bg-primary text-primary-foreground" : "bg-fci-100 text-fci-700",
                )}
              >
                {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
              </span>
              <p
                data-testid="chat-bubble"
                className={cn(
                  "rounded-[14px] px-[15px] py-2.5 text-[14.5px] leading-[1.55]",
                  isUser
                    ? "rounded-tr-[4px] bg-primary text-primary-foreground"
                    : "rounded-tl-[4px] border border-border bg-white text-gray-800",
                )}
              >
                {m.content}
              </p>
            </div>
          );
        })}
        {p.sending && (
          // Ba chấm nhảy không tự đọc được — `role="status"` + `aria-label` giữ lại
          // đúng thông tin thật ("đang chờ trả lời") cho screen reader, thứ mà dòng
          // chữ "Đang trả lời…" cũ vẫn đang nói.
          <p role="status" aria-label="Đang trả lời" className="ml-[42px] flex items-center gap-1.5">
            <span className="size-[7px] animate-typing rounded-full bg-gray-400" />
            <span className="size-[7px] animate-typing rounded-full bg-gray-400 [animation-delay:.15s]" />
            <span className="size-[7px] animate-typing rounded-full bg-gray-400 [animation-delay:.3s]" />
          </p>
        )}
      </div>

      {p.error && (
        <p className="mx-5 mt-3 rounded-lg bg-error-muted px-3 py-2 text-[13px] text-error-strong">
          {p.error}
        </p>
      )}

      {p.suggested.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 py-3">
          {p.suggested.map((q) => (
            <Button
              key={q}
              variant="outline"
              size="sm"
              onClick={() => p.onPickSuggested(q)}
              className="rounded-full border-fci-100 bg-fci-50 px-3 py-1.5 text-[12.5px] text-fci-700 hover:bg-fci-100 hover:text-fci-700"
            >
              {q}
            </Button>
          ))}
        </div>
      )}

      <form
        className="flex gap-2 border-t border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          p.onSend();
        }}
      >
        <Input
          value={p.draft}
          onChange={(e) => p.onDraftChange(e.target.value)}
          placeholder="Nhập câu hỏi của bạn…"
          disabled={p.sending}
          className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-[14.5px] focus:border-primary focus:ring-[3px] focus:ring-fci-50"
        />
        {/*
          Nút gửi giờ chỉ còn icon — không có chữ "Gửi" nào còn hiển thị trong DOM.
          `aria-label` là đường DUY NHẤT đặt tên cho nút: thiếu nó, cả
          `getByRole("button", { name: /Gửi/ })` (hai test) VÀ screen reader thật
          đều mất cách gọi tên nút này.
        */}
        <Button
          type="submit"
          aria-label="Gửi"
          disabled={p.sending || p.draft.trim().length === 0}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-fci-600"
        >
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
