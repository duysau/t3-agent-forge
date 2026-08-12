import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useVoiceCall, type VoiceCallDeps } from "./use-voice-call";
import { VoiceGatewayError, type AudioSocket } from "~/lib/voice/gateway-client";
import type { GatewayEvent } from "~/lib/voice/events";

const BASE = "http://localhost:8787";
const PROFILE = "longchau";

const OPENED = {
  conversationId: "cv_1",
  callId: "call_1",
  audioUrl: "/v1/conversations/cv_1/audio",
  audioFormat: { encoding: "pcm_s16le", sampleRate: 8000, channels: 1 },
  audioSampleRate: 8000,
};

/**
 * Bộ giả cho toàn bộ biên ngoài của hook: gateway (HTTP + WS) và Web Audio.
 * Mỗi fake lưu lại thứ tự gọi để test khẳng định được những điều KHÔNG nhìn thấy
 * trên giao diện — ví dụ mic phải xin trước khi mở phiên.
 */
function makeDeps() {
  const calls: string[] = [];
  const sentFrames: ArrayBuffer[] = [];
  const pushedAudio: ArrayBuffer[] = [];

  let socketHandlers: Parameters<VoiceCallDeps["openSocket"]>[1] | null = null;
  const socket = {
    sentEnd: false,
    closed: false,
  };

  const capture = { stopped: false };
  const player = { stopped: false };
  let onFrame: ((frame: ArrayBuffer) => void) | null = null;

  const deps: VoiceCallDeps = {
    openConversation: vi.fn(async () => {
      calls.push("openConversation");
      return OPENED;
    }),
    endConversation: vi.fn(async () => {
      calls.push("endConversation");
    }),
    releaseOnUnload: vi.fn(() => {
      calls.push("releaseOnUnload");
    }),
    openSocket: vi.fn((url, handlers) => {
      calls.push(`openSocket:${url}`);
      socketHandlers = handlers;
      const api: AudioSocket = {
        socket: {} as WebSocket,
        sendAudio: (frame) => sentFrames.push(frame),
        end: () => {
          socket.sentEnd = true;
        },
        close: () => {
          socket.closed = true;
        },
      };
      return api;
    }),
    startCapture: vi.fn(async (input) => {
      calls.push("startCapture");
      onFrame = input.onFrame;
      return {
        stop: () => {
          capture.stopped = true;
        },
      };
    }),
    createPlayer: vi.fn(() => {
      calls.push("createPlayer");
      return {
        push: (frame: ArrayBuffer) => pushedAudio.push(frame),
        stop: () => {
          player.stopped = true;
        },
      };
    }),
  };

  return {
    deps,
    calls,
    sentFrames,
    pushedAudio,
    capture,
    player,
    socket,
    emitOpen: () => act(() => socketHandlers?.onOpen()),
    emit: (event: GatewayEvent) => act(() => socketHandlers?.onEvent(event)),
    emitAudio: (frame: ArrayBuffer) => act(() => socketHandlers?.onAudio(frame)),
    emitClose: (code: number, reason = "") =>
      act(() => socketHandlers?.onClose({ code, reason })),
    pushMicFrame: (frame: ArrayBuffer) => act(() => onFrame?.(frame)),
  };
}

function renderCall(deps: VoiceCallDeps) {
  return renderHook(() => useVoiceCall({ baseUrl: BASE, profile: PROFILE, deps }));
}

describe("useVoiceCall", () => {
  it("bắt đầu ở trạng thái idle, chưa chạm gateway hay micro", () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);

    expect(result.current.status).toBe("idle");
    expect(h.calls).toEqual([]);
  });

  /**
   * Thứ tự này là một quyết định, không phải tình cờ: xin micro TRƯỚC khi mở phiên.
   * Người dùng từ chối quyền micro là kết cục thường gặp nhất, và nếu phiên đã mở
   * trước đó thì một slot CCU bị chiếm tới hết 600 giây cho một cuộc gọi không bao
   * giờ có tiếng — trên profile hạn mức nhỏ, vài lần từ chối là hết slot cả buổi.
   */
  it("xin micro TRƯỚC khi mở phiên trên gateway", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);

    await act(() => result.current.start());

    expect(h.calls.indexOf("startCapture")).toBeLessThan(h.calls.indexOf("openConversation"));
  });

  it("micro bị từ chối thì KHÔNG mở phiên nào, và báo lỗi đọc được", async () => {
    const h = makeDeps();
    h.deps.startCapture = vi.fn().mockRejectedValue(new Error("Permission denied"));
    const { result } = renderCall(h.deps);

    await act(() => result.current.start());

    expect(h.deps.openConversation).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/micro/i);
  });

  it("mở phiên thất bại thì dừng micro lại, không để đèn ghi âm sáng", async () => {
    const h = makeDeps();
    h.deps.openConversation = vi
      .fn()
      .mockRejectedValue(new VoiceGatewayError("ccu_exceeded", "Hết slot cuộc gọi", 429));
    const { result } = renderCall(h.deps);

    await act(() => result.current.start());

    expect(h.capture.stopped).toBe(true);
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("Hết slot");
  });

  it("nối WS tới đúng audioUrl gateway trả về, đổi scheme sang ws", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);

    await act(() => result.current.start());

    expect(h.calls).toContain("openSocket:ws://localhost:8787/v1/conversations/cv_1/audio");
  });

  it("WS mở thì vào trạng thái live", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());

    h.emitOpen();

    expect(result.current.status).toBe("live");
  });

  /**
   * Agent chỉ mở lời sau khi NGHE thấy tiếng, nên mic phải đẩy liên tục ngay khi WS
   * mở — kể cả frame im lặng (`frontend-handoff-1.md` §1.3). KHÔNG có half-duplex
   * guard như spec §9.2 mô tả: dừng gửi trong lúc agent nói là làm agent mất luôn
   * tín hiệu để biết lượt đã sang mình.
   */
  it("đẩy frame mic lên socket, kể cả trong lúc agent đang nói", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    h.pushMicFrame(new Int16Array(160).buffer);
    h.emit({ type: "speech.started", turn: 1, index: 0 });
    h.pushMicFrame(new Int16Array(160).buffer);

    expect(h.sentFrames).toHaveLength(2);
    expect(result.current.agentSpeaking).toBe(true);
  });

  it("frame binary xuống thì đưa vào player", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    const frame = new Int16Array(320).buffer;
    h.emitAudio(frame);

    expect(h.pushedAudio).toEqual([frame]);
  });

  /**
   * `utterance` là lời NGƯỜI DÙNG (ASR), `reply.segment` là lời AGENT. Đảo hai bên
   * này là hội thoại hiện ngược trên màn hình mà không có lỗi nào để lần theo.
   */
  it("utterance vào phía người dùng, reply.segment vào phía agent, đúng thứ tự", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    h.emit({ type: "utterance", turn: 1, text: "cho tôi hỏi giá" });
    h.emit({ type: "reply.segment", turn: 1, index: 0, text: "dạ 350.000đ ạ" });

    expect(result.current.transcript.map((t) => [t.side, t.text])).toEqual([
      ["user", "cho tôi hỏi giá"],
      ["agent", "dạ 350.000đ ạ"],
    ]);
  });

  it("turn.completed tắt indicator đang nói", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    h.emit({ type: "speech.started", turn: 1, index: 0 });
    h.emit({ type: "turn.completed", turn: 1 });

    expect(result.current.agentSpeaking).toBe(false);
  });

  it("agent cúp máy thì dọn micro, player và nhả phiên trên gateway", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    h.emit({ type: "conversation.ended", reason: "agent_ended" });
    await waitFor(() => expect(result.current.status).toBe("ended"));

    expect(h.capture.stopped).toBe(true);
    expect(h.player.stopped).toBe(true);
    expect(h.deps.endConversation).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "cv_1" }),
    );
  });

  it("hết thời gian tối đa thì nói rõ lý do thay vì báo lỗi chung", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    h.emit({ type: "conversation.ended", reason: "max_duration" });

    await waitFor(() => expect(result.current.endedReason).toMatch(/thời gian|600/i));
  });

  it("cúp máy: gửi frame end, đóng socket, dừng mic/player rồi DELETE phiên", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    await act(() => result.current.hangUp());

    expect(h.socket.sentEnd).toBe(true);
    expect(h.socket.closed).toBe(true);
    expect(h.capture.stopped).toBe(true);
    expect(h.player.stopped).toBe(true);
    expect(h.deps.endConversation).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("ended");
  });

  /**
   * 404 khi DELETE nghĩa là phiên đã được dọn trước — `endConversation` đã coi đó
   * là bình thường. Nhưng một lỗi THẬT ở bước dọn cũng không được biến việc cúp máy
   * thành thất bại: người dùng đã cúp, mic đã tắt, chẳng còn gì để họ làm.
   */
  it("DELETE lỗi vẫn kết thúc cuộc gọi ở trạng thái ended", async () => {
    const h = makeDeps();
    h.deps.endConversation = vi.fn().mockRejectedValue(new Error("gateway sập"));
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    await act(() => result.current.hangUp());

    expect(result.current.status).toBe("ended");
    expect(h.capture.stopped).toBe(true);
  });

  /**
   * Ba mã 44xx là quyết định của gateway, không phải sự cố mạng — nói đúng nguyên
   * nhân thì người dùng biết nên mở lại cuộc gọi hay đi tìm chỗ khác.
   */
  it("socket đóng với 4404 thì báo phiên không còn tồn tại", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    h.emitClose(4404, "không có Conversation");

    await waitFor(() => expect(result.current.error).toMatch(/không còn tồn tại|mở lại/i));
  });

  it("socket đóng bình thường sau khi đã cúp máy thì KHÔNG báo lỗi", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();
    await act(() => result.current.hangUp());

    h.emitClose(1000, "conversation đã kết thúc");

    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe("ended");
  });

  /**
   * Worklet thu mic ghim cứng 8000 Hz. Nếu gateway đổi sample rate, giọng gửi lên
   * sai tốc độ và ASR không ra chữ nào — im lặng hoàn toàn, không lỗi. Chặn ngay
   * lúc mở phiên, và nhả cả mic lẫn phiên vừa mở.
   */
  it("gateway đổi sample rate thì từ chối gọi và nhả sạch tài nguyên", async () => {
    const h = makeDeps();
    h.deps.openConversation = vi.fn().mockResolvedValue({
      ...OPENED,
      audioFormat: { encoding: "pcm_s16le", sampleRate: 16000, channels: 1 },
      audioSampleRate: 16000,
    });
    const { result } = renderCall(h.deps);

    await act(() => result.current.start());

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/16000|sample rate/i);
    expect(h.capture.stopped).toBe(true);
    expect(h.deps.endConversation).toHaveBeenCalled();
    expect(h.deps.openSocket).not.toHaveBeenCalled();
  });

  it("event error từ gateway hiện nguyên văn message của nó", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    h.emit({ type: "error", code: "upstream_socket", message: "socket lên FPT đứt" });

    await waitFor(() => expect(result.current.error).toContain("socket lên FPT đứt"));
  });

  /**
   * Rời trang giữa cuộc gọi (điều hướng trong app, không phải đóng tab) phải nhả
   * phiên — nếu không slot CCU bị giữ tới hết 600 giây, và người kế tiếp bấm Gọi
   * nhận 429.
   */
  it("unmount giữa cuộc gọi thì nhả phiên và dừng micro", async () => {
    const h = makeDeps();
    const { result, unmount } = renderCall(h.deps);
    await act(() => result.current.start());
    h.emitOpen();

    unmount();

    expect(h.capture.stopped).toBe(true);
    expect(h.deps.releaseOnUnload).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "cv_1" }),
    );
  });

  it("bấm start hai lần liên tiếp chỉ mở một phiên", async () => {
    const h = makeDeps();
    const { result } = renderCall(h.deps);

    await act(async () => {
      await Promise.all([result.current.start(), result.current.start()]);
    });

    expect(h.deps.openConversation).toHaveBeenCalledTimes(1);
  });
});
