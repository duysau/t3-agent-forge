"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ChatDemoView, type ChatMessage } from "./chat-demo-view";

export function ChatDemo({ slug, suggested }: { slug: string; suggested: string[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const send = api.chat.send.useMutation();

  async function ask(text: string) {
    const message = text.trim();
    if (message.length === 0) return;

    setError(null);
    setDraft("");
    // History gửi lên là hội thoại TRƯỚC câu này — backend nhận message riêng.
    const history = messages;
    setMessages((m) => [...m, { role: "user", content: message }]);

    try {
      const out = await send.mutateAsync({ slug, message, history });
      setMessages((m) => [...m, { role: "assistant", content: out.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được câu hỏi");
    }
  }

  return (
    <ChatDemoView
      messages={messages}
      draft={draft}
      onDraftChange={setDraft}
      onSend={() => void ask(draft)}
      sending={send.isPending}
      error={error}
      suggested={messages.length === 0 ? suggested : []}
      onPickSuggested={(q) => void ask(q)}
    />
  );
}
