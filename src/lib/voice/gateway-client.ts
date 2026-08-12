/**
 * Client cho gateway voice của nền tảng FPT (repo `../../hackathon`, cổng 8787).
 *
 * Ba lời gọi trong trục voice — POST mở phiên, WebSocket audio, DELETE dọn —
 * đều phát TRỰC TIẾP từ browser, không qua tRPC. Đây là ngoại lệ có ý thức so
 * với quy tắc "mọi HTTP đi qua tRPC" của spec §ADR-2, vì:
 *
 * - Next không proxy WebSocket được;
 * - DELETE lúc đóng tab phải là `fetch(..., {keepalive: true})` phát từ chính
 *   document đang biến mất, không thể là một mutation tRPC chờ round-trip;
 * - gateway giữ API key ở phía nó và mở CORS trên MỌI response (đã đọc
 *   `../../hackathon/src/api/respond.ts`), nên URL này không lộ bí mật nào.
 */
import { parseGatewayEvent, type GatewayEvent } from "./events";

/** Mã lỗi do chính client này sinh ra, không đến từ gateway. */
type LocalErrorCode = "network" | "contract";

export class VoiceGatewayError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, message: string, status: number | null) {
    super(message);
    this.name = "VoiceGatewayError";
    this.code = code;
    this.status = status;
  }
}

export interface VoiceConversation {
  conversationId: string;
  callId: string | null;
  /** Đường dẫn WS gateway trả về. KHÔNG tự dựng lại — xem `audioSocketUrl`. */
  audioUrl: string;
  /** Giữ nguyên giá trị gateway trả về, dùng để log khi hình dạng lạ. */
  audioFormat: unknown;
  /** Sample rate đọc được, `null` khi không nhận ra hình dạng. */
  audioSampleRate: number | null;
}

/**
 * Sample rate của luồng audio, đọc từ `audioFormat`.
 *
 * Hai hình dạng vì đã gặp cả hai: gateway THẬT (kiểm 2026-08-12 trên
 * `79.108.219.161:8787`) trả object `{encoding, sampleRate, channels}`, còn
 * `frontend-handoff-1.md` §1.2 ghi chuỗi `"pcm_s16le;rate=8000;channels=1"`.
 * Chấp nhận cả hai, và trả `null` cho hình dạng thứ ba thay vì ném: đây là tín
 * hiệu để CẢNH BÁO, và một cuộc gọi vẫn nên mở được khi ta không đọc nổi nhãn.
 *
 * Đọc được nó là điều kiện để phát hiện gateway đổi sang 16kHz — worklet thu mic
 * ghim cứng 8000 Hz, nên một lần đổi âm thầm làm cả cuộc gọi sai tốc độ mà không
 * sinh lỗi nào.
 */
function readSampleRate(audioFormat: unknown): number | null {
  if (typeof audioFormat === "number") return audioFormat;
  if (audioFormat !== null && typeof audioFormat === "object") {
    const rate = (audioFormat as { sampleRate?: unknown }).sampleRate;
    return typeof rate === "number" ? rate : null;
  }
  if (typeof audioFormat === "string") {
    const match = /(?:rate|sampleRate)=(\d+)/.exec(audioFormat);
    return match ? Number(match[1]) : null;
  }
  return null;
}

/** Sample rate mà worklet thu mic và player đều ghim cứng. */
export const VOICE_SAMPLE_RATE = 8000;

/**
 * Thân lỗi của gateway là `{code, message}` (`../../hackathon/src/api/respond.ts`).
 * Đọc nó mà KHÔNG bao giờ ném thêm một lỗi thứ hai: một reverse proxy chết trả
 * HTML, và `res.json()` lúc đó ném SyntaxError che mất status — thứ duy nhất còn
 * đáng tin ở nhánh này.
 */
async function readError(res: Response): Promise<{ code: string; message: string }> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (body !== null && typeof body === "object") {
    const code = (body as { code?: unknown }).code;
    const message = (body as { message?: unknown }).message;
    if (typeof code === "string") {
      return { code, message: typeof message === "string" ? message : "" };
    }
  }
  return { code: `http_${res.status}`, message: res.statusText || "request thất bại" };
}

/**
 * Câu tiếng Việt cho người đang đứng trước màn hình demo.
 *
 * Mỗi mã ở đây đều dẫn tới một việc phải làm khác nhau — nên thông báo phải nói
 * ra việc đó, không chỉ dịch lại mã. `unknown_profile` là lỗi ĐÃ GẶP THẬT khi
 * gửi `longchau` tới gateway chạy trên máy khác.
 */
function describe(
  code: string,
  message: string,
  status: number | null,
  profile: string,
): string {
  switch (code) {
    case "unknown_profile":
      return `Gateway không có Agent Profile "${profile}" — sửa NEXT_PUBLIC_VOICE_PROFILE cho khớp agents.local.yaml của gateway`;
    case "ccu_exceeded":
      return "Hết slot cuộc gọi đồng thời trên nền tảng — chờ vài giây rồi thử lại";
    case "upstream_token":
      return "Nền tảng voice từ chối cấp token cho cuộc gọi này — kiểm tra apiKey/agentId của profile";
    case "upstream_greeting":
      return "Nền tảng voice không trả được câu chào — thử lại sau ít phút";
    case "invalid_profile":
    case "invalid_mode":
    case "invalid_body":
      return `Gateway từ chối yêu cầu mở cuộc gọi: ${message || code}`;
    case "network":
      return "Không kết nối được gateway voice — kiểm tra gateway còn chạy và NEXT_PUBLIC_VOICE_GATEWAY_URL";
    default:
      return `Gateway lỗi ${status ?? ""} ${code}${message ? `: ${message}` : ""}`.trim();
  }
}

function localError(code: LocalErrorCode, message: string, profile: string): VoiceGatewayError {
  return new VoiceGatewayError(code, describe(code, message, null, profile), null);
}

export interface OpenVoiceInput {
  baseUrl: string;
  profile: string;
  /** Biến nghiệp vụ chuyển thẳng lên agent (tên khách, thương hiệu…). */
  attributes?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
}

export async function openVoiceConversation(input: OpenVoiceInput): Promise<VoiceConversation> {
  const doFetch = input.fetchImpl ?? fetch;
  const base = input.baseUrl.replace(/\/$/, "");

  let res: Response;
  try {
    res = await doFetch(`${base}/v1/conversations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        profile: input.profile,
        mode: "voice",
        attributes: input.attributes ?? {},
        clientStatus: {},
      }),
    });
  } catch {
    throw localError("network", "", input.profile);
  }

  if (!res.ok) {
    const { code, message } = await readError(res);
    throw new VoiceGatewayError(code, describe(code, message, res.status, input.profile), res.status);
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw localError("contract", "", input.profile);
  }

  const conversationId = (payload as { conversationId?: unknown }).conversationId;
  const audioUrl = (payload as { audioUrl?: unknown }).audioUrl;
  // `audioUrl` bắt buộc, và cố tình KHÔNG có đường đoán: tự ghép
  // `/v1/conversations/<id>/audio` là mở đường cho một demo im lặng 404 nếu
  // gateway đổi route. Thiếu field thì nổ ngay ở đây, kèm mã `contract`.
  if (typeof conversationId !== "string" || typeof audioUrl !== "string") {
    throw new VoiceGatewayError(
      "contract",
      "Gateway trả 201 nhưng thiếu conversationId/audioUrl",
      res.status,
    );
  }

  const callId = (payload as { callId?: unknown }).callId;
  const audioFormat = (payload as { audioFormat?: unknown }).audioFormat;
  return {
    conversationId,
    audioUrl,
    callId: typeof callId === "string" ? callId : null,
    audioFormat: audioFormat ?? null,
    audioSampleRate: readSampleRate(audioFormat),
  };
}

/**
 * URL WebSocket cho socket audio: lấy `audioUrl` gateway trả về rồi chỉ đổi
 * scheme. `new URL(audioUrl, base)` xử lý luôn cả hai trường hợp — đường dẫn
 * tương đối (gateway hiện trả vậy) và URL tuyệt đối (nếu sau này nó trỏ sang host
 * khác).
 */
export function audioSocketUrl(baseUrl: string, audioUrl: string): string {
  const url = new URL(audioUrl, baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export interface EndInput {
  baseUrl: string;
  conversationId: string;
  fetchImpl?: typeof fetch;
}

export async function endConversation(input: EndInput): Promise<void> {
  const doFetch = input.fetchImpl ?? fetch;
  const base = input.baseUrl.replace(/\/$/, "");

  let res: Response;
  try {
    res = await doFetch(`${base}/v1/conversations/${encodeURIComponent(input.conversationId)}`, {
      method: "DELETE",
    });
  } catch {
    throw new VoiceGatewayError("network", describe("network", "", null, ""), null);
  }

  // 404 = phiên đã được dọn từ trước (agent cúp, hết thời gian, gateway thu hồi).
  // Đó là kết quả MONG MUỐN của DELETE, không phải lỗi — báo đỏ ở đây làm mọi
  // cuộc gọi kết thúc bình thường trông như thất bại.
  if (res.ok || res.status === 404) return;

  const { code, message } = await readError(res);
  throw new VoiceGatewayError(code, describe(code, message, res.status, ""), res.status);
}

/**
 * Nhả phiên khi trang sắp biến mất (F5, đóng tab, điều hướng đi).
 *
 * `keepalive: true` là BẮT BUỘC: fetch thường bị huỷ ngay khi document bị huỷ,
 * và slot CCU khi đó bị chiếm tới hết 600 giây của cuộc gọi. Không await được —
 * trang không còn đó để nhận kết quả — nên mọi lỗi ở đây đều bị nuốt có chủ đích.
 */
export function releaseOnUnload(input: EndInput): void {
  const doFetch = input.fetchImpl ?? fetch;
  const base = input.baseUrl.replace(/\/$/, "");
  try {
    void doFetch(`${base}/v1/conversations/${encodeURIComponent(input.conversationId)}`, {
      method: "DELETE",
      keepalive: true,
    })?.catch(() => undefined);
  } catch {
    /* trang đang biến mất — không còn ai để báo */
  }
}

export interface AudioSocket {
  socket: WebSocket;
  sendAudio: (frame: ArrayBuffer) => void;
  /** Xin kết thúc lượt một cách tử tế: text frame `{"type":"end"}`. */
  end: () => void;
  close: () => void;
}

/**
 * Mở socket audio và tách hai loại frame: binary là PCM giọng agent, text là
 * event JSON.
 */
export function openAudioSocket(
  wsUrl: string,
  handlers: {
    onOpen: () => void;
    onEvent: (event: GatewayEvent) => void;
    onAudio: (frame: ArrayBuffer) => void;
    onClose: (info: { code: number; reason: string }) => void;
    onError: () => void;
  },
  socketImpl?: (url: string) => WebSocket,
): AudioSocket {
  const socket = socketImpl ? socketImpl(wsUrl) : new WebSocket(wsUrl);
  socket.binaryType = "arraybuffer";

  socket.addEventListener("open", () => handlers.onOpen());
  socket.addEventListener("message", (message: MessageEvent<unknown>) => {
    if (typeof message.data !== "string") {
      handlers.onAudio(message.data as ArrayBuffer);
      return;
    }
    const event = parseGatewayEvent(message.data);
    if (event !== null) handlers.onEvent(event);
  });
  socket.addEventListener("close", (event: CloseEvent) =>
    handlers.onClose({ code: event.code, reason: event.reason }),
  );
  socket.addEventListener("error", () => handlers.onError());

  return {
    socket,
    sendAudio: (frame) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(frame);
    },
    end: () => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "end" }));
    },
    close: () => socket.close(),
  };
}

/**
 * Câu tiếng Việt cho mã đóng socket audio của gateway
 * (`../../hackathon/src/api/ws.ts`). Ba mã 44xx là quyết định của gateway, không
 * phải sự cố mạng — nói đúng nguyên nhân thì người dùng biết nên thử lại hay không.
 */
export function describeCloseCode(code: number): string | null {
  switch (code) {
    case 4404:
      return "Phiên gọi không còn tồn tại trên gateway — mở lại cuộc gọi";
    case 4409:
      return "Phiên này là chat text, không phải cuộc gọi thoại";
    case 4410:
      return "Phiên này đã có một kết nối audio khác đang chạy";
    case 1011:
      return "Gateway lỗi khi khởi tạo phiên audio";
    default:
      return null;
  }
}
