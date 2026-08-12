"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  audioSocketUrl,
  describeCloseCode,
  endConversation,
  openAudioSocket,
  openVoiceConversation,
  releaseOnUnload,
  VoiceGatewayError,
  VOICE_SAMPLE_RATE,
  type AudioSocket,
  type VoiceConversation,
} from "~/lib/voice/gateway-client";
import { createPlayer, startCapture, type CaptureHandle, type Player } from "~/lib/voice/audio";
import { eventText, type EndReason, type GatewayEvent } from "~/lib/voice/events";

export type VoiceCallStatus = "idle" | "connecting" | "live" | "ending" | "ended" | "error";

export interface TranscriptEntry {
  id: string;
  side: "user" | "agent";
  text: string;
}

/**
 * Biên ngoài của hook, tiêm được để test chạy trên jsdom (không có Web Audio,
 * không có WebSocket thật). Mặc định là các hàm thật — không có nhánh nào chỉ
 * dành cho test trong thân hook.
 */
export interface VoiceCallDeps {
  openConversation: (input: {
    baseUrl: string;
    profile: string;
    attributes?: Record<string, unknown>;
  }) => Promise<VoiceConversation>;
  endConversation: (input: { baseUrl: string; conversationId: string }) => Promise<void>;
  releaseOnUnload: (input: { baseUrl: string; conversationId: string }) => void;
  openSocket: (
    url: string,
    handlers: {
      onOpen: () => void;
      onEvent: (event: GatewayEvent) => void;
      onAudio: (frame: ArrayBuffer) => void;
      onClose: (info: { code: number; reason: string }) => void;
      onError: () => void;
    },
  ) => AudioSocket;
  startCapture: (input: { onFrame: (frame: ArrayBuffer) => void }) => Promise<CaptureHandle>;
  createPlayer: () => Player;
}

const realDeps: VoiceCallDeps = {
  openConversation: (input) => openVoiceConversation(input),
  endConversation: (input) => endConversation(input),
  releaseOnUnload: (input) => releaseOnUnload(input),
  openSocket: (url, handlers) => openAudioSocket(url, handlers),
  startCapture: (input) => startCapture(input),
  createPlayer: () => createPlayer(),
};

/** Lý do kết thúc, nói bằng thứ người dùng hiểu được. */
const END_REASONS: Record<EndReason, string> = {
  agent_ended: "Agent đã kết thúc cuộc gọi",
  client_ended: "Bạn đã kết thúc cuộc gọi",
  max_duration: "Hết thời gian tối đa của một cuộc gọi (600 giây)",
  upstream_closed: "Nền tảng voice đã đóng cuộc gọi",
  upstream_error: "Nền tảng voice gặp lỗi và đã đóng cuộc gọi",
  abandoned: "Cuộc gọi bị thu hồi vì không hoạt động",
};

const MIC_DENIED =
  "Không mở được micro — cấp quyền micro cho trang này rồi thử lại (voice cần HTTPS hoặc localhost)";

export interface UseVoiceCallInput {
  baseUrl: string;
  profile: string;
  /** Biến nghiệp vụ chuyển thẳng lên agent. */
  attributes?: Record<string, unknown>;
  deps?: VoiceCallDeps;
}

export interface UseVoiceCall {
  status: VoiceCallStatus;
  error: string | null;
  endedReason: string | null;
  transcript: TranscriptEntry[];
  agentSpeaking: boolean;
  start: () => Promise<void>;
  hangUp: () => Promise<void>;
}

export function useVoiceCall(input: UseVoiceCallInput): UseVoiceCall {
  const deps = input.deps ?? realDeps;

  const [status, setStatus] = useState<VoiceCallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  // Tài nguyên đang chiếm giữ. Ref chứ không state: chúng phải đọc/ghi được từ
  // trong callback của socket và từ hàm dọn khi unmount, những nơi không thấy
  // được state mới nhất.
  const captureRef = useRef<CaptureHandle | null>(null);
  const playerRef = useRef<Player | null>(null);
  const socketRef = useRef<AudioSocket | null>(null);
  const conversationRef = useRef<string | null>(null);
  // Chặn hai lượt start chồng nhau: mỗi lượt mở một phiên thật và chiếm một slot
  // CCU. `status` không dùng được cho việc này — nó cập nhật bất đồng bộ, nên hai
  // cú bấm liền nhau đều thấy "idle".
  const startingRef = useRef(false);
  // Đã cúp chủ động chưa. Socket đóng SAU khi cúp là chuyện bình thường, không
  // phải lỗi — thiếu cờ này thì mọi cuộc gọi kết thúc tử tế đều hiện một dòng đỏ.
  const endingRef = useRef(false);
  const seqRef = useRef(0);

  const appendTranscript = useCallback((side: TranscriptEntry["side"], text: string) => {
    seqRef.current += 1;
    const id = `${side}-${seqRef.current}`;
    setTranscript((prev) => [...prev, { id, side, text }]);
  }, []);

  /**
   * Nhả mọi thứ đang chiếm giữ. Gọi được nhiều lần (mỗi handle tự chặn lần thứ
   * hai), vì có tới bốn đường dẫn tới đây: người dùng cúp, agent cúp, socket đóng,
   * component unmount.
   */
  const releaseLocal = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    captureRef.current?.stop();
    captureRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
    setAgentSpeaking(false);
  }, []);

  const releaseRemote = useCallback(async () => {
    const conversationId = conversationRef.current;
    conversationRef.current = null;
    if (conversationId === null) return;
    try {
      await deps.endConversation({ baseUrl: input.baseUrl, conversationId });
    } catch {
      // Người dùng đã cúp, mic đã tắt — không còn việc gì cho họ làm với lỗi này.
      // Slot CCU sẽ được gateway tự thu hồi khi hết thời gian.
    }
  }, [deps, input.baseUrl]);

  const handleEvent = useCallback(
    (event: GatewayEvent) => {
      switch (event.type) {
        case "utterance": {
          const text = eventText(event);
          if (text !== null) appendTranscript("user", text);
          return;
        }
        case "reply.segment": {
          const text = eventText(event);
          if (text !== null) appendTranscript("agent", text);
          return;
        }
        case "speech.started":
          setAgentSpeaking(true);
          return;
        case "turn.completed":
          setAgentSpeaking(false);
          return;
        case "conversation.ended": {
          const reason = (event as { reason?: EndReason }).reason;
          setEndedReason(
            (reason !== undefined ? END_REASONS[reason] : null) ?? "Cuộc gọi đã kết thúc",
          );
          endingRef.current = true;
          releaseLocal();
          setStatus("ended");
          void releaseRemote();
          return;
        }
        case "error": {
          const message = (event as { message?: string }).message;
          setError(message ? `Gateway báo lỗi: ${message}` : "Gateway báo lỗi trong cuộc gọi");
          return;
        }
        default:
          // Mọi loại event khác (`conversation.started`, `turn.started`,
          // `reply.delta`, `conversation.state`, và loại lạ gateway thêm sau này)
          // không đổi giao diện. Bỏ qua có chủ đích, không log ầm ĩ.
          return;
      }
    },
    [appendTranscript, releaseLocal, releaseRemote],
  );

  const start = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    endingRef.current = false;

    setError(null);
    setEndedReason(null);
    setTranscript([]);
    setStatus("connecting");

    // Micro TRƯỚC, gateway sau. Người dùng từ chối quyền là kết cục thường gặp
    // nhất, và nếu phiên đã mở trước đó thì một slot CCU bị chiếm tới hết 600 giây
    // cho một cuộc gọi không bao giờ có tiếng.
    let capture: CaptureHandle;
    try {
      capture = await deps.startCapture({
        onFrame: (frame) => socketRef.current?.sendAudio(frame),
      });
    } catch (err) {
      // Thông báo của trình duyệt là tiếng Anh và nói về "Permission"; câu của ta
      // nói cả điều kiện secure context, thứ hay là nguyên nhân thật khi trang mở
      // qua http trên IP LAN.
      setError(err instanceof Error && /8000|8kHz/i.test(err.message) ? err.message : MIC_DENIED);
      setStatus("error");
      startingRef.current = false;
      return;
    }
    captureRef.current = capture;

    let conversation: VoiceConversation;
    try {
      conversation = await deps.openConversation({
        baseUrl: input.baseUrl,
        profile: input.profile,
        attributes: input.attributes,
      });
    } catch (err) {
      releaseLocal();
      setError(
        err instanceof VoiceGatewayError || err instanceof Error
          ? err.message
          : "Không mở được cuộc gọi",
      );
      setStatus("error");
      startingRef.current = false;
      return;
    }
    conversationRef.current = conversation.conversationId;

    // Worklet thu mic và player đều ghim cứng 8000 Hz. Gateway đổi sample rate thì
    // giọng gửi lên sai tốc độ và ASR không ra chữ nào — im lặng hoàn toàn, không
    // lỗi. Chặn ở đây, và nhả cả mic lẫn phiên vừa mở.
    if (
      conversation.audioSampleRate !== null &&
      conversation.audioSampleRate !== VOICE_SAMPLE_RATE
    ) {
      releaseLocal();
      await releaseRemote();
      setError(
        `Gateway yêu cầu sample rate ${conversation.audioSampleRate}Hz, client chỉ gửi được ${VOICE_SAMPLE_RATE}Hz — cần cập nhật worklet thu mic`,
      );
      setStatus("error");
      startingRef.current = false;
      return;
    }

    playerRef.current = deps.createPlayer();

    socketRef.current = deps.openSocket(audioSocketUrl(input.baseUrl, conversation.audioUrl), {
      // Mic đã chạy từ trước; `sendAudio` tự bỏ frame khi socket chưa OPEN, nên
      // không cần đệm gì — frame của vài chục ms đầu mất đi là im lặng, không phải
      // lời nói.
      onOpen: () => setStatus("live"),
      onEvent: handleEvent,
      onAudio: (frame) => playerRef.current?.push(frame),
      onClose: ({ code }) => {
        if (endingRef.current) return;
        const explained = describeCloseCode(code);
        releaseLocal();
        if (explained !== null) {
          setError(explained);
          setStatus("error");
        } else {
          setEndedReason("Kết nối tới gateway đã đóng");
          setStatus("ended");
        }
        void releaseRemote();
      },
      onError: () => {
        setError("Kết nối audio tới gateway bị lỗi — thử gọi lại");
      },
    });

    startingRef.current = false;
  }, [deps, handleEvent, input.attributes, input.baseUrl, input.profile, releaseLocal, releaseRemote]);

  const hangUp = useCallback(async () => {
    endingRef.current = true;
    setStatus("ending");
    // Xin kết thúc tử tế trước khi đóng: gateway cần frame `{"type":"end"}` để nhả
    // cuộc gọi phía trên (xem `../../hackathon/src/api/ws.ts`) — với voice mode đó
    // là đường nhả DUY NHẤT.
    socketRef.current?.end();
    releaseLocal();
    await releaseRemote();
    setEndedReason((prev) => prev ?? END_REASONS.client_ended);
    setStatus("ended");
  }, [releaseLocal, releaseRemote]);

  /**
   * Rời trang giữa cuộc gọi.
   *
   * Hai đường khác nhau, cần cả hai: `beforeunload` cho F5/đóng tab (phải là fetch
   * `keepalive`, một mutation thường bị huỷ cùng document), và cleanup của effect
   * cho điều hướng trong app (component unmount nhưng trang vẫn sống). Thiếu đường
   * nào thì slot CCU bị giữ tới hết 600 giây và người kế tiếp bấm Gọi nhận 429.
   */
  useEffect(() => {
    const onBeforeUnload = () => {
      const conversationId = conversationRef.current;
      if (conversationId !== null) {
        deps.releaseOnUnload({ baseUrl: input.baseUrl, conversationId });
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      const conversationId = conversationRef.current;
      captureRef.current?.stop();
      captureRef.current = null;
      playerRef.current?.stop();
      playerRef.current = null;
      socketRef.current?.close();
      socketRef.current = null;
      if (conversationId !== null) {
        conversationRef.current = null;
        // `releaseOnUnload` chứ không `endConversation`: lúc unmount không còn ai
        // chờ promise, và `keepalive` là thứ duy nhất đảm bảo request đi được.
        deps.releaseOnUnload({ baseUrl: input.baseUrl, conversationId });
      }
    };
  }, [deps, input.baseUrl]);

  return { status, error, endedReason, transcript, agentSpeaking, start, hangUp };
}
