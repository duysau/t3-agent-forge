import { describe, expect, it, vi } from "vitest";
import { createPlayer, startCapture, type AudioEnv } from "./audio";

/**
 * jsdom không có Web Audio, nên toàn bộ test này chạy trên fake tiêm qua
 * `AudioEnv`. Fake chỉ dựng đúng những gì `audio.ts` chạm tới — mọi thứ khác để
 * TypeScript ép kiểu ở biên, vì một fake đầy đủ của `AudioContext` là hàng trăm
 * dòng không kiểm được điều gì.
 */
class FakeSource {
  buffer: { duration: number } | null = null;
  startedAt: number | null = null;
  stopped = false;
  disconnected = false;
  onended: (() => void) | null = null;
  connect = () => undefined;
  disconnect = () => {
    this.disconnected = true;
  };
  start = (when: number) => {
    this.startedAt = when;
  };
  stop = () => {
    this.stopped = true;
    if (this.stopped && this.startedAt === null) throw new Error("chưa start");
  };
}

class FakeContext {
  readonly sampleRate: number;
  state: "suspended" | "running" | "closed" = "running";
  currentTime = 0;
  destination = { kind: "destination" };
  closed = false;
  sources: FakeSource[] = [];
  gains: Array<{ gain: { value: number }; connected: unknown[] }> = [];
  addedModules: string[] = [];

  constructor(options?: { sampleRate?: number }, forcedRate?: number) {
    this.sampleRate = forcedRate ?? options?.sampleRate ?? 48_000;
  }

  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn(async () => {
    this.closed = true;
    this.state = "closed";
  });

  audioWorklet = {
    addModule: vi.fn(async (url: string) => {
      this.addedModules.push(url);
    }),
  };

  createMediaStreamSource = () => ({ connect: () => undefined, disconnect: () => undefined });

  createGain = () => {
    const node = {
      gain: { value: 1 },
      connected: [] as unknown[],
      connect(target: unknown) {
        this.connected.push(target);
      },
      disconnect: () => undefined,
    };
    this.gains.push(node);
    return node;
  };

  createBuffer = (_channels: number, length: number, rate: number) => ({
    length,
    duration: length / rate,
    getChannelData: () => new Float32Array(length),
  });

  createBufferSource = () => {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  };
}

interface FakeTrack {
  stopped: boolean;
  stop: () => void;
}

function fakeStream(): { stream: MediaStream; tracks: FakeTrack[] } {
  const tracks: FakeTrack[] = [
    {
      stopped: false,
      stop() {
        this.stopped = true;
      },
    },
  ];
  return { stream: { getTracks: () => tracks } as unknown as MediaStream, tracks };
}

function envFor(
  context: FakeContext,
  overrides: Partial<AudioEnv> = {},
): { env: AudioEnv; tracks: FakeTrack[]; workletNode: { port: { onmessage: unknown } } } {
  const { stream, tracks } = fakeStream();
  const workletNode = {
    port: { onmessage: null as unknown },
    connect: () => undefined,
    disconnect: () => undefined,
  };
  return {
    tracks,
    workletNode,
    env: {
      createContext: () => context as unknown as AudioContext,
      getUserMedia: async () => stream,
      createWorkletNode: () => workletNode as unknown as AudioWorkletNode,
      ...overrides,
    },
  };
}

describe("startCapture", () => {
  /**
   * Trình duyệt tạo AudioContext ở `suspended` khi chưa có thao tác người dùng, và
   * ở trạng thái đó `process()` của worklet KHÔNG BAO GIỜ chạy — micro im lặng mà
   * không có lỗi nào.
   */
  it("resume context đang suspended", async () => {
    const context = new FakeContext({ sampleRate: 8000 }, 8000);
    context.state = "suspended";
    const { env } = envFor(context);

    await startCapture({ onFrame: vi.fn(), env });

    expect(context.resume).toHaveBeenCalled();
  });

  /**
   * Contract gateway là 8000 Hz. Một số trình duyệt từ chối tần số đó và trả về
   * context 48kHz — gửi 48kHz lên gateway thì agent nghe giọng nhanh gấp 6 lần và
   * ASR không ra chữ nào. Phải nổ ngay, kèm câu nói rõ trình duyệt.
   */
  it("từ chối khi trình duyệt không cho AudioContext 8000 Hz, và nhả context", async () => {
    const context = new FakeContext({ sampleRate: 8000 }, 48_000);
    const { env } = envFor(context);

    await expect(startCapture({ onFrame: vi.fn(), env })).rejects.toThrow(/8000|8kHz/i);
    expect(context.close).toHaveBeenCalled();
  });

  /**
   * Nếu một bước SAU khi đã chiếm micro bị lỗi mà không nhả tài nguyên, chấm đỏ
   * "đang ghi âm" sáng mãi trên tab — người dùng nghĩ mình vẫn đang bị thu.
   */
  it("lỗi sau khi đã chiếm micro thì dừng track và đóng context", async () => {
    const context = new FakeContext({ sampleRate: 8000 }, 8000);
    const { env, tracks } = envFor(context, {
      createWorkletNode: () => {
        throw new Error("worklet lỗi");
      },
    });

    await expect(startCapture({ onFrame: vi.fn(), env })).rejects.toThrow(/worklet/);
    expect(tracks[0]!.stopped).toBe(true);
    expect(context.close).toHaveBeenCalled();
  });

  /**
   * Một AudioWorkletNode treo lơ lửng KHÔNG được gọi `process()`. Nó phải có
   * đường tới destination, và đường đó đi qua một gain 0 để không dội tiếng micro
   * ra loa.
   */
  it("nối worklet tới destination qua gain 0", async () => {
    const context = new FakeContext({ sampleRate: 8000 }, 8000);
    const { env } = envFor(context);

    await startCapture({ onFrame: vi.fn(), env });

    expect(context.gains).toHaveLength(1);
    expect(context.gains[0]!.gain.value).toBe(0);
    expect(context.gains[0]!.connected).toContain(context.destination);
  });

  it("stop() dừng track và đóng context", async () => {
    const context = new FakeContext({ sampleRate: 8000 }, 8000);
    const { env, tracks } = envFor(context);

    const capture = await startCapture({ onFrame: vi.fn(), env });
    capture.stop();

    expect(tracks[0]!.stopped).toBe(true);
    expect(context.close).toHaveBeenCalled();
  });

  it("gọi stop() hai lần không đóng context lần thứ hai", async () => {
    const context = new FakeContext({ sampleRate: 8000 }, 8000);
    const { env } = envFor(context);

    const capture = await startCapture({ onFrame: vi.fn(), env });
    capture.stop();
    capture.stop();

    expect(context.close).toHaveBeenCalledTimes(1);
  });

  it("chuyển frame của worklet ra onFrame", async () => {
    const context = new FakeContext({ sampleRate: 8000 }, 8000);
    const { env, workletNode } = envFor(context);
    const onFrame = vi.fn();

    await startCapture({ onFrame, env });
    const frame = new Int16Array([1, 2, 3]).buffer;
    (workletNode.port.onmessage as (e: { data: ArrayBuffer }) => void)({ data: frame });

    expect(onFrame).toHaveBeenCalledWith(frame);
  });
});

describe("createPlayer", () => {
  it("lên lịch các frame nối tiếp nhau, frame đầu lùi đúng một nhịp đệm jitter", () => {
    const context = new FakeContext(undefined, 8000);
    context.currentTime = 10;
    const player = createPlayer({ env: envFor(context).env });

    // 160 mẫu = 20ms ở 8kHz.
    player.push(new Int16Array(160).buffer);
    player.push(new Int16Array(160).buffer);

    expect(context.sources[0]!.startedAt).toBeCloseTo(10.2);
    expect(context.sources[1]!.startedAt).toBeCloseTo(10.22);
  });

  /**
   * Nếu lịch phát đã trôi vào quá khứ (mạng khựng giữa cuộc gọi), phải kéo nó về
   * hiện tại — không thì mọi frame tồn đọng phát dồn một lúc thành tiếng nhiễu.
   */
  it("lịch trôi vào quá khứ thì kéo về hiện tại thay vì phát dồn", () => {
    const context = new FakeContext(undefined, 8000);
    context.currentTime = 10;
    const player = createPlayer({ env: envFor(context).env });
    player.push(new Int16Array(160).buffer);

    context.currentTime = 30; // mạng khựng 20 giây
    player.push(new Int16Array(160).buffer);

    expect(context.sources[1]!.startedAt).toBeCloseTo(30.2);
  });

  /**
   * Gateway gửi khung tới 32000 byte và không đảm bảo chia hết cho 2. Test này
   * chốt hành vi ở biên đó (một source vẫn được lên lịch, không exception) chứ
   * KHÔNG chốt riêng dòng cắt byte thừa: dạng `new Int16Array(buf, 0, n)` vốn đã
   * chịu được byteLength lẻ, nên bỏ dòng đó đi test này vẫn xanh — đã kiểm bằng
   * cách phá thật. Cái có răng là test khung ngắn ngay bên dưới.
   */
  it("frame lẻ byte không ném, chỉ bỏ byte thừa", () => {
    const context = new FakeContext(undefined, 8000);
    const player = createPlayer({ env: envFor(context).env });

    expect(() => player.push(new ArrayBuffer(321))).not.toThrow();
    expect(context.sources).toHaveLength(1);
  });

  it("frame ngắn hơn một mẫu thì bỏ hẳn", () => {
    const context = new FakeContext(undefined, 8000);
    const player = createPlayer({ env: envFor(context).env });

    player.push(new ArrayBuffer(1));

    expect(context.sources).toHaveLength(0);
  });

  /**
   * Chỉ `close()` context là chưa đủ: audio ĐÃ lên lịch vẫn phát nốt trên một số
   * trình duyệt, nên người dùng bấm cúp máy rồi vẫn nghe agent nói thêm vài giây.
   */
  it("stop() dừng mọi source đang chờ rồi mới đóng context", () => {
    const context = new FakeContext(undefined, 8000);
    const player = createPlayer({ env: envFor(context).env });
    player.push(new Int16Array(160).buffer);
    player.push(new Int16Array(160).buffer);

    player.stop();

    expect(context.sources.every((s) => s.stopped)).toBe(true);
    expect(context.close).toHaveBeenCalled();
  });

  it("push sau khi stop() thì bỏ qua, không dựng source mới", () => {
    const context = new FakeContext(undefined, 8000);
    const player = createPlayer({ env: envFor(context).env });

    player.stop();
    player.push(new Int16Array(160).buffer);

    expect(context.sources).toHaveLength(0);
  });

  /**
   * Trình duyệt từ chối context 8000 Hz thì vẫn phải phát được — chỉ quay lại rủi
   * ro lấy mẫu lại (tiếng ù ~50Hz), còn im lặng hoàn toàn thì tệ hơn nhiều.
   */
  it("trình duyệt từ chối 8000 Hz thì vẫn phát bằng context mặc định", () => {
    let call = 0;
    const rejecting = new FakeContext(undefined, 48_000);
    const fallback = new FakeContext(undefined, 44_100);
    const env: AudioEnv = {
      ...envFor(rejecting).env,
      createContext: () => {
        call += 1;
        return (call === 1 ? rejecting : fallback) as unknown as AudioContext;
      },
    };

    const player = createPlayer({ env });
    player.push(new Int16Array(160).buffer);

    expect(rejecting.close).toHaveBeenCalled();
    expect(fallback.sources).toHaveLength(1);
  });
});
