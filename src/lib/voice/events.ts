/**
 * Event mà gateway đẩy xuống trên WebSocket audio, dưới dạng text frame JSON.
 *
 * Đối chiếu 1:1 với `../../hackathon/src/domain/events.ts` — nguồn sự thật là
 * code gateway, KHÔNG phải bảng trong `frontend-handoff-1.md` §1.3: bảng đó ghi
 * `utterance` mang field `transcript`, còn gateway thật gửi `text`. Đọc theo bảng
 * cho ra bubble rỗng suốt cuộc gọi mà không có lỗi nào để lần theo.
 */
export type ConversationState = "waiting_user_response" | "ended";

export type EndReason =
  | "agent_ended"
  | "client_ended"
  | "max_duration"
  | "upstream_closed"
  | "upstream_error"
  | "abandoned";

export type GatewayEvent =
  | {
      type: "conversation.started";
      conversationId: string;
      callId: string;
      state: ConversationState;
      fallbackText?: string;
    }
  | { type: "turn.started"; turn: number }
  | { type: "utterance"; turn: number; text: string }
  | { type: "reply.delta"; turn: number; text: string }
  | { type: "reply.segment"; turn: number; index: number; text: string }
  | { type: "speech.started"; turn: number; index: number }
  | { type: "turn.completed"; turn: number }
  | { type: "conversation.state"; state: ConversationState }
  | { type: "conversation.ended"; reason: EndReason }
  | { type: "error"; code: string; message: string }
  // Gateway là code của người khác và có thể thêm loại event bất cứ lúc nào.
  // Nhánh này để một loại lạ đi qua thay vì làm vỡ cả cuộc gọi — cùng học thuyết
  // fail-open đã chọn cho `facts_source` ở biên HTTP.
  | { type: string };

/**
 * Đọc một text frame thành event.
 *
 * Trả `null` cho frame không dùng được (JSON hỏng, thiếu `type`) thay vì ném:
 * handler `message` của WebSocket mà ném thì mọi frame SAU đó cũng mất — một
 * frame rác không được phép giết cả cuộc gọi.
 */
export function parseGatewayEvent(raw: string): GatewayEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const type = (value as { type?: unknown }).type;
  if (typeof type !== "string" || type === "") return null;
  return value as GatewayEvent;
}

/** Text của một event, dùng cho các loại mang lời thoại. */
export function eventText(event: GatewayEvent): string | null {
  const text = (event as { text?: unknown }).text;
  return typeof text === "string" && text !== "" ? text : null;
}
