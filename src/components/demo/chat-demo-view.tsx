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
                  "rounded-[14px] px-[15px] py-2.5 text-sm leading-[1.55]",
                  isUser
                    ? "rounded-tr-[4px] bg-primary text-primary-foreground"
                    : "rounded-tl-[4px] border border-border bg-surface text-gray-800",
                )}
              >
                {m.content}
              </p>
            </div>
          );
        })}
        {p.sending && (
          // Ba chấm nhảy không tự đọc được — `role="status"` là một live region,
          // và AT đọc phần TEXT CONTENT của nó khi nó xuất hiện/đổi, không phải
          // `aria-label`. Không có text node nào bên trong thì không có gì được
          // đọc. Giữ lại đúng dòng chữ "Đang trả lời…" cũ, nhưng ẩn khỏi mắt
          // (sr-only) để người dùng thấy vẫn chỉ là ba chấm nhảy.
          <p role="status" aria-label="Đang trả lời" className="ml-[42px] flex items-center gap-1.5">
            <span className="sr-only">Đang trả lời…</span>
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
              className="rounded-full border-fci-100 bg-fci-50 px-3 py-1.5 text-xs text-fci-700 hover:bg-fci-100 hover:text-fci-700"
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
        {/*
          `h-auto` / `md:text-sm` / `focus-visible:` đều để thắng phần base của
          `Input` (shadcn) — twMerge chỉ gỡ xung đột trong cùng nhóm utility, nên nếu
          không có class cùng nhóm thì base thắng. Ở đây hậu quả nhìn thấy rõ nhất:
          `h-9` của base cho ô nhập 36px nằm cạnh nút gửi `size-11` (44px), trong khi
          `.chat-input input` của prototype cao hơn nút — `padding:11px 16px;
          font-size:14.5px` (nên `py-[11px] px-4`, sửa từ `py-2.5` = 10px) — và chiều
          cao đó do padding sinh ra, không phải một số ghim cứng.
        */}
        <Input
          value={p.draft}
          onChange={(e) => p.onDraftChange(e.target.value)}
          placeholder="Nhập câu hỏi của bạn…"
          disabled={p.sending}
          className="h-auto flex-1 rounded-full border border-gray-300 px-4 py-[11px] text-sm focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-fci-50 md:text-sm"
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
