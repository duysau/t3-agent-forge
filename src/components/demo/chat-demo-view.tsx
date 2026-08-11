"use client";

import { Send } from "lucide-react";
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
    <div className="flex h-[460px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {p.messages.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <p
              data-testid="chat-bubble"
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-[15px]",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-gray-900",
              )}
            >
              {m.content}
            </p>
          </div>
        ))}
        {p.sending && (
          <p className="text-[13px] text-muted-foreground">Đang trả lời…</p>
        )}
      </div>

      {p.error && (
        <p className="mx-5 mb-2 rounded-lg bg-error-muted px-3 py-2 text-[13px] text-error-strong">
          {p.error}
        </p>
      )}

      {p.suggested.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-2">
          {p.suggested.map((q) => (
            <Button key={q} variant="outline" size="sm" onClick={() => p.onPickSuggested(q)}>
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
        />
        <Button type="submit" disabled={p.sending || p.draft.trim().length === 0}>
          <Send className="size-4" />
          Gửi
        </Button>
      </form>
    </div>
  );
}
