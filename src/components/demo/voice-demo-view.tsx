"use client";

import { Bot, Phone, PhoneOff, User } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useStickToBottom } from "~/hooks/use-stick-to-bottom";
import { cn } from "~/lib/utils";
import type { TranscriptEntry, VoiceCallStatus } from "~/hooks/use-voice-call";

export interface VoiceDemoViewProps {
  /** `false` khi thiếu `NEXT_PUBLIC_VOICE_GATEWAY_URL`. */
  configured: boolean;
  status: VoiceCallStatus;
  error: string | null;
  endedReason: string | null;
  transcript: TranscriptEntry[];
  agentSpeaking: boolean;
  onCall: () => void;
  onHangUp: () => void;
}

const CALL_LABEL: Record<VoiceCallStatus, string> = {
  idle: "Gọi thử",
  connecting: "Đang nối…",
  live: "Đang gọi",
  ending: "Đang cúp…",
  ended: "Gọi lại",
  error: "Gọi lại",
};

/**
 * Chữ cho chỉ báo cuộc gọi. `null` = không có gì đang diễn ra, nên không render
 * live region nào (một live region rỗng vẫn được screen reader theo dõi).
 *
 * MỘT chỉ báo duy nhất mang cả hai tin — đường thoại đang mở, và ai đang nói — chứ
 * không phải hai: hai live region cùng phát là tiếng ồn cho screen reader, và trên
 * màn hình là hai chấm nhấp nháy tranh nhau nói cùng một chuyện.
 */
function callStatusLabel(status: VoiceCallStatus, agentSpeaking: boolean): string | null {
  if (status === "connecting") return "Đang nối cuộc gọi…";
  if (status === "ending") return "Đang cúp máy…";
  if (status !== "live") return null;
  return agentSpeaking ? "Agent đang nói…" : "Đang gọi — cứ nói vào micro";
}

export function VoiceDemoView(p: VoiceDemoViewProps) {
  // Gọi TRƯỚC nhánh `!configured` phía dưới: hook phải chạy đúng cùng thứ tự ở mọi
  // lượt render, còn nhánh đó `return` sớm. Đặt nó sau nhánh khiến số hook thay đổi
  // khi `configured` đổi — React vỡ ngay tại lượt render đó (và eslint chặn được).
  const scrollRef = useStickToBottom<HTMLDivElement>(`${p.transcript.length}`);

  if (!p.configured) {
    return (
      <div className="p-6">
        <p className="rounded-xl bg-warning-muted px-4 py-3 text-sm text-warning-strong">
          Voice chưa cấu hình: thiếu <code>NEXT_PUBLIC_VOICE_GATEWAY_URL</code>. Dựng gateway voice
          rồi trỏ biến đó vào nó (mặc định cổng 8787) để gọi thử ngay trong trình duyệt.
        </p>
      </div>
    );
  }

  const callStatus = callStatusLabel(p.status, p.agentSpeaking);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-gray-25 px-5 py-4">
        {p.status === "live" || p.status === "ending" ? (
          <Button variant="outline" onClick={p.onHangUp} disabled={p.status === "ending"}>
            <PhoneOff className="size-4" />
            Cúp máy
          </Button>
        ) : (
          <Button onClick={p.onCall} disabled={p.status === "connecting"}>
            <Phone className="size-4" />
            {CALL_LABEL[p.status]}
          </Button>
        )}

        {callStatus !== null && (
          // Chấm đỏ nhấp nháy kiểu đèn ghi âm: dấu hiệu duy nhất cho thấy đường
          // thoại đang mở. `role="status"` chỉ được đọc khi bên trong CÓ text node —
          // bài học đã trả giá ở chỉ báo đang gõ của ChatDemoView — nên chấm để
          // nhìn, chữ để đọc, cả hai trong cùng một phần tử.
          <p role="status" className="ml-auto flex items-center gap-2 text-sm font-semibold text-error-strong">
            <span
              data-testid="call-dot"
              aria-hidden
              className="relative grid size-3 place-items-center"
            >
              {/* Vòng loang mờ dần + chấm đặc ở giữa: nhìn ra ngay cả khi ảnh chụp
                  màn hình đứng yên, không phụ thuộc riêng vào animation. */}
              <span className="absolute inline-flex size-3 animate-ping rounded-full bg-destructive opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive" />
            </span>
            {callStatus}
          </p>
        )}
      </div>

      {/*
        Transcript voice chảy liên tục theo từng `reply.segment`, nên không tự cuộn
        thì câu agent vừa nói gần như không bao giờ nhìn thấy — nặng hơn ở chat, vì
        ở đây người dùng không gõ gì để mà biết mình đang chờ dòng nào.
      */}
      <div
        ref={scrollRef}
        data-testid="voice-scroll"
        className="flex h-[380px] flex-col gap-3.5 overflow-y-auto bg-gray-25 p-5"
      >
        {p.transcript.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Bấm “Gọi thử” rồi nói vào micro — cần cấp quyền micro, và trang phải mở qua HTTPS hoặc
            localhost. Agent trả lời bằng knowledge base đã được đẩy lên trong lượt dựng.
          </p>
        )}
        {p.transcript.map((entry) => {
          const isUser = entry.side === "user";
          return (
            <div
              key={entry.id}
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
                data-testid="voice-bubble"
                data-side={entry.side}
                className={cn(
                  "rounded-[14px] px-[15px] py-2.5 text-sm leading-[1.55]",
                  isUser
                    ? "rounded-tr-[4px] bg-primary text-primary-foreground"
                    : "rounded-tl-[4px] border border-border bg-surface text-gray-800",
                )}
              >
                {entry.text}
              </p>
            </div>
          );
        })}
      </div>

      {/*
        Lỗi và lý do kết thúc là HAI chuyện khác nhau: "agent đã cúp máy" hay "hết
        600 giây" là kết cục bình thường của một cuộc gọi, không phải sự cố. Hiện
        chúng như nhau (đỏ, role=alert) làm mọi cuộc gọi thành công trông như hỏng.
      */}
      {p.error !== null && (
        <p role="alert" className="mx-5 my-3 rounded-lg bg-error-muted px-3 py-2 text-[13px] text-error-strong">
          {p.error}
        </p>
      )}
      {p.error === null && p.endedReason !== null && (
        <p className="mx-5 my-3 rounded-lg bg-gray-50 px-3 py-2 text-[13px] text-gray-600">
          {p.endedReason}
        </p>
      )}
    </div>
  );
}
