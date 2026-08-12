import { describe, expect, it, vi } from "vitest";
import {
  audioSocketUrl,
  endConversation,
  openVoiceConversation,
  releaseOnUnload,
  VoiceGatewayError,
} from "./gateway-client";
import { parseGatewayEvent } from "./events";

const BASE = "http://localhost:8787";

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const OPENED = {
  conversationId: "cv_1",
  callId: "call_1",
  mode: "voice",
  audioUrl: "/v1/conversations/cv_1/audio",
  audioFormat: "pcm_s16le;rate=8000;channels=1",
};

describe("openVoiceConversation", () => {
  it("POST /v1/conversations với mode voice và profile được cấu hình", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(OPENED, 201));

    const result = await openVoiceConversation({
      baseUrl: BASE,
      profile: "longchau",
      fetchImpl,
    });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/v1/conversations`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      profile: "longchau",
      mode: "voice",
      attributes: {},
      clientStatus: {},
    });
    expect(result.conversationId).toBe("cv_1");
    expect(result.audioUrl).toBe("/v1/conversations/cv_1/audio");
  });

  it("chuyển attributes nghiệp vụ lên gateway nguyên văn", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(OPENED, 201));

    await openVoiceConversation({
      baseUrl: BASE,
      profile: "longchau",
      attributes: { brand: "Sen Spa" },
      fetchImpl,
    });

    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string) as {
      attributes: Record<string, unknown>;
    };
    expect(body.attributes).toEqual({ brand: "Sen Spa" });
  });

  /**
   * Profile được nạp từ file YAML của từng máy chạy gateway, nên tên khác nhau
   * theo máy — đây là lỗi ĐÃ GẶP THẬT: gateway đang chạy lúc viết đoạn này trả
   * đúng 404 này cho `longchau` mà handoff ghi. Thông báo phải chỉ ra tên đang
   * gửi và biến môi trường phải sửa, nếu không người ta sẽ đi sửa mic.
   */
  it("404 unknown_profile nói rõ tên profile đang gửi và biến cần sửa", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonRes({ code: "unknown_profile", message: 'không có Agent Profile tên "longchau"' }, 404),
    );

    const err: unknown = await openVoiceConversation({
      baseUrl: BASE,
      profile: "longchau",
      fetchImpl,
    }).then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(VoiceGatewayError);
    expect((err as VoiceGatewayError).code).toBe("unknown_profile");
    expect((err as VoiceGatewayError).message).toContain("longchau");
    expect((err as VoiceGatewayError).message).toContain("NEXT_PUBLIC_VOICE_PROFILE");
  });

  it("429 ccu_exceeded thành thông báo hết slot cuộc gọi", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonRes({ code: "ccu_exceeded", message: "chạm hạn mức" }, 429));

    const err: unknown = await openVoiceConversation({
      baseUrl: BASE,
      profile: "p",
      fetchImpl,
    }).then(() => null, (e: unknown) => e);

    expect((err as VoiceGatewayError).code).toBe("ccu_exceeded");
    expect((err as VoiceGatewayError).message).toMatch(/slot|đồng thời|thử lại/i);
  });

  /**
   * Một reverse proxy chết trả HTML, không JSON. `res.json()` khi đó ném
   * SyntaxError và che mất status — thứ duy nhất còn đáng tin ở nhánh lỗi.
   */
  it("thân lỗi không phải JSON vẫn cho ra lỗi đọc được, không ném SyntaxError", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("<html>502 Bad Gateway</html>", { status: 502 }));

    const err: unknown = await openVoiceConversation({
      baseUrl: BASE,
      profile: "p",
      fetchImpl,
    }).then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(VoiceGatewayError);
    expect((err as VoiceGatewayError).status).toBe(502);
    expect((err as VoiceGatewayError).message).toContain("502");
  });

  it("gateway không chạy (fetch throw) thành lỗi nói gateway không kết nối được", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const err: unknown = await openVoiceConversation({
      baseUrl: BASE,
      profile: "p",
      fetchImpl,
    }).then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(VoiceGatewayError);
    expect((err as VoiceGatewayError).code).toBe("network");
    expect((err as VoiceGatewayError).message).toMatch(/gateway/i);
  });

  /**
   * `audioFormat` của gateway THẬT là một object — đã kiểm ngày 2026-08-12 trên
   * `79.108.219.161:8787`: `{"encoding":"pcm_s16le","sampleRate":8000,"channels":1}`,
   * KHÔNG phải chuỗi `"pcm_s16le;rate=8000;channels=1"` như
   * `frontend-handoff-1.md` §1.2 ghi. Đọc được sample rate là điều kiện để phát
   * hiện gateway đổi sang 16kHz — worklet thu mic ghim cứng 8000, nên một lần đổi
   * âm thầm là cả cuộc gọi nghe sai tốc độ mà không có lỗi nào.
   */
  it("đọc sample rate từ audioFormat dạng object", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonRes(
        {
          ...OPENED,
          audioFormat: { encoding: "pcm_s16le", sampleRate: 8000, channels: 1 },
        },
        201,
      ),
    );

    const result = await openVoiceConversation({ baseUrl: BASE, profile: "p", fetchImpl });

    expect(result.audioSampleRate).toBe(8000);
  });

  it("đọc sample rate từ audioFormat dạng chuỗi như handoff mô tả", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(OPENED, 201));

    const result = await openVoiceConversation({ baseUrl: BASE, profile: "p", fetchImpl });

    expect(result.audioSampleRate).toBe(8000);
  });

  it("audioFormat lạ thì sample rate là null, KHÔNG vỡ cuộc gọi", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonRes({ ...OPENED, audioFormat: { codec: "opus" } }, 201));

    const result = await openVoiceConversation({ baseUrl: BASE, profile: "p", fetchImpl });

    expect(result.audioSampleRate).toBeNull();
  });

  it("thiếu audioUrl trong 201 là lỗi contract, không đoán đường dẫn", async () => {
    // Tự ghép `/v1/conversations/<id>/audio` là mở đường cho một demo im lặng
    // 404 nếu gateway đổi route — nên thiếu field này phải nổ ngay tại đây.
    const { audioUrl: _drop, ...withoutAudioUrl } = OPENED;
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(withoutAudioUrl, 201));

    const err: unknown = await openVoiceConversation({
      baseUrl: BASE,
      profile: "p",
      fetchImpl,
    }).then(() => null, (e: unknown) => e);

    expect((err as VoiceGatewayError).code).toBe("contract");
  });
});

describe("audioSocketUrl", () => {
  it("đổi http sang ws và giữ nguyên audioUrl gateway trả về", () => {
    expect(audioSocketUrl(BASE, "/v1/conversations/cv_1/audio")).toBe(
      "ws://localhost:8787/v1/conversations/cv_1/audio",
    );
  });

  it("đổi https sang wss", () => {
    expect(audioSocketUrl("https://gw.example.com", "/v1/conversations/cv_1/audio")).toBe(
      "wss://gw.example.com/v1/conversations/cv_1/audio",
    );
  });

  it("audioUrl tuyệt đối thì dùng nguyên nó, không ghép vào base", () => {
    expect(audioSocketUrl(BASE, "http://other.host:9000/v1/conversations/cv_9/audio")).toBe(
      "ws://other.host:9000/v1/conversations/cv_9/audio",
    );
  });
});

describe("endConversation", () => {
  it("DELETE đúng conversation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await endConversation({ baseUrl: BASE, conversationId: "cv_1", fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/v1/conversations/cv_1`);
    expect(init.method).toBe("DELETE");
  });

  /**
   * 404 nghĩa là phiên đã được dọn trước (agent cúp, hết thời gian, hoặc gateway
   * thu hồi) — đó là KẾT QUẢ MONG MUỐN của DELETE. Báo đỏ ở đây làm mọi cuộc gọi
   * kết thúc bình thường trông như thất bại.
   */
  it("404 không phải lỗi — phiên đã được dọn trước", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonRes({ code: "unknown_conversation", message: "không có" }, 404));

    await expect(
      endConversation({ baseUrl: BASE, conversationId: "cv_1", fetchImpl }),
    ).resolves.toBeUndefined();
  });

  it("500 thì vẫn báo lỗi", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonRes({ code: "internal", message: "sập" }, 500));

    await expect(
      endConversation({ baseUrl: BASE, conversationId: "cv_1", fetchImpl }),
    ).rejects.toBeInstanceOf(VoiceGatewayError);
  });
});

describe("releaseOnUnload", () => {
  /**
   * `keepalive: true` là BẮT BUỘC: một fetch thường bị huỷ ngay khi document
   * biến mất, và slot CCU bị chiếm tới hết 600 giây của cuộc gọi
   * (`frontend-handoff-1.md` §1.5). Trên một profile hạn mức nhỏ, vài lần F5 là
   * hết slot cho cả buổi demo.
   */
  it("gửi DELETE với keepalive để sống sót qua lúc trang đóng", () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    releaseOnUnload({ baseUrl: BASE, conversationId: "cv_1", fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/v1/conversations/cv_1`);
    expect(init.method).toBe("DELETE");
    expect(init.keepalive).toBe(true);
  });

  it("fetch ném đồng bộ cũng không làm vỡ handler unload", () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      throw new Error("trang đang biến mất");
    });

    expect(() =>
      releaseOnUnload({ baseUrl: BASE, conversationId: "cv_1", fetchImpl }),
    ).not.toThrow();
  });
});

describe("parseGatewayEvent", () => {
  /**
   * Field của `utterance` là `text`, KHÔNG phải `transcript` như
   * `frontend-handoff-1.md` §1.3 ghi — đã đối chiếu với
   * `../../hackathon/src/domain/events.ts`. Đọc sai tên field cho ra bubble rỗng
   * suốt cuộc gọi mà không có lỗi nào.
   */
  it("đọc utterance qua field text", () => {
    const event = parseGatewayEvent('{"type":"utterance","turn":1,"text":"cho tôi hỏi giá"}');
    expect(event).toEqual({ type: "utterance", turn: 1, text: "cho tôi hỏi giá" });
  });

  it("đọc reply.segment của agent", () => {
    const event = parseGatewayEvent('{"type":"reply.segment","turn":1,"index":0,"text":"dạ"}');
    expect(event?.type).toBe("reply.segment");
  });

  it("JSON hỏng trả null thay vì ném — một frame lỗi không được giết cuộc gọi", () => {
    expect(parseGatewayEvent("{khong-phai-json")).toBeNull();
  });

  it("frame thiếu type trả null", () => {
    expect(parseGatewayEvent('{"turn":1}')).toBeNull();
  });

  /**
   * Gateway có thể thêm loại event mới bất cứ lúc nào (nó là code của người
   * khác). Fail-open: giữ nguyên frame lạ để tầng trên bỏ qua, KHÔNG ném — cùng
   * học thuyết với `facts_source` ở biên HTTP.
   */
  it("loại event lạ vẫn đi qua, không ném", () => {
    const event = parseGatewayEvent('{"type":"loai.moi.toanh","x":1}');
    expect(event?.type).toBe("loai.moi.toanh");
  });
});
