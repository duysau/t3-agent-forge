/**
 * Thu micro và phát giọng agent cho voice mode.
 *
 * Cổng từ `../../hackathon/demo/audio.js` — module mẫu của gateway, đã trả giá
 * cho từng cái bẫy trong này. Mọi comment giải thích "vì sao" ở đây là bẫy THẬT
 * đã gặp, không phải phòng xa.
 */
import { VOICE_SAMPLE_RATE } from "./gateway-client";

const JITTER_BUFFER_SEC = 0.2;

/**
 * Ba lời gọi Web Audio/mediaDevices mà module này cần, tách ra thành seam để test
 * chạy được trên jsdom (không có Web Audio). Đây là seam DUY NHẤT — mọi logic
 * khác là code thật, không có nhánh riêng cho test.
 */
export interface AudioEnv {
  createContext: (options?: { sampleRate?: number }) => AudioContext;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createWorkletNode: (context: AudioContext, name: string) => AudioWorkletNode;
}

export const browserAudioEnv: AudioEnv = {
  createContext: (options) => new AudioContext(options),
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  createWorkletNode: (context, name) => new AudioWorkletNode(context, name),
};

export interface CaptureHandle {
  stop: () => void;
}

export interface StartCaptureInput {
  onFrame: (frame: ArrayBuffer) => void;
  /** URL file worklet trong `public/`. */
  workletUrl?: string;
  env?: AudioEnv;
}

export const MIC_WORKLET_URL = "/voice/mic-worklet.js";
const MIC_PROCESSOR_NAME = "mic-processor";

/**
 * Mở micro và đẩy từng frame PCM 20ms (Int16, 8kHz) ra `onFrame`.
 *
 * Gọi hàm này TRƯỚC khi mở phiên trên gateway: người dùng từ chối quyền micro là
 * kết cục thường gặp nhất, và nếu phiên đã mở trước đó thì một slot CCU bị chiếm
 * tới hết 600 giây cho một cuộc gọi không bao giờ có tiếng.
 */
export async function startCapture(input: StartCaptureInput): Promise<CaptureHandle> {
  const env = input.env ?? browserAudioEnv;
  // AudioContext ở 8000 Hz để CHÍNH TRÌNH DUYỆT hạ mẫu từ 48kHz của micro —
  // không tự viết bộ lọc, không tự nội suy.
  const context = env.createContext({ sampleRate: VOICE_SAMPLE_RATE });

  // Mọi thứ sau khi đã chiếm tài nguyên thật (context, micro) phải được nhả lại
  // nếu một bước sau đó hỏng. Không có phần này, người dùng từ chối quyền hoặc
  // worklet lỗi sẽ để chấm đỏ "đang ghi âm" sáng mãi trên tab.
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let node: AudioWorkletNode | null = null;
  let sink: GainNode | null = null;

  const release = (): void => {
    if (node !== null) {
      node.port.onmessage = null;
      node.disconnect();
    }
    source?.disconnect();
    sink?.disconnect();
    if (stream !== null) {
      for (const track of stream.getTracks()) track.stop();
    }
    void context.close();
  };

  try {
    if (context.sampleRate !== VOICE_SAMPLE_RATE) {
      throw new Error(
        `Trình duyệt không cho AudioContext ở ${VOICE_SAMPLE_RATE}Hz (đang là ${context.sampleRate}Hz) — thử Chrome hoặc Edge bản mới`,
      );
    }
    // Context mới tạo ở trạng thái `suspended` nếu chưa có thao tác người dùng, và
    // ở trạng thái đó `process()` của worklet KHÔNG BAO GIỜ chạy — micro im lặng
    // mà không có lỗi nào để lần theo.
    if (context.state === "suspended") await context.resume();

    stream = await env.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    await context.audioWorklet.addModule(input.workletUrl ?? MIC_WORKLET_URL);
    source = context.createMediaStreamSource(stream);
    node = env.createWorkletNode(context, MIC_PROCESSOR_NAME);
    node.port.onmessage = (message: MessageEvent<ArrayBuffer>) => input.onFrame(message.data);
    source.connect(node);

    // Node phải có đường tới destination thì đồ thị mới được kéo — một
    // AudioWorkletNode treo lơ lửng không được gọi `process()`. Đi qua một gain
    // bằng 0 để không dội tiếng micro ra loa.
    sink = context.createGain();
    sink.gain.value = 0;
    node.connect(sink);
    sink.connect(context.destination);
  } catch (error) {
    release();
    throw error;
  }

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      release();
    },
  };
}

export interface Player {
  push: (frame: ArrayBuffer) => void;
  stop: () => void;
}

/**
 * Ưu tiên context ở đúng 8000 Hz để KHÔNG có bước lấy mẫu lại nào.
 *
 * Mỗi khung 20ms là một `AudioBufferSourceNode` riêng, mà bộ resample của source
 * node không mang state qua ranh giới buffer: ở context 48kHz, mẫu cuối của khung
 * N và mẫu đầu của khung N+1 được nội suy độc lập, để lại một gián đoạn nhỏ mỗi
 * 20ms — nghe thành tiếng ù ~50Hz chồng lên giọng agent. Cùng tần số thì bộ
 * resample không chạy và vấn đề biến mất.
 *
 * Trình duyệt từ chối tần số này thì VẪN phát, chỉ là quay lại rủi ro đó — im
 * lặng hoàn toàn tệ hơn nhiều.
 */
function createPlaybackContext(env: AudioEnv): AudioContext {
  try {
    const context = env.createContext({ sampleRate: VOICE_SAMPLE_RATE });
    if (context.sampleRate === VOICE_SAMPLE_RATE) return context;
    void context.close();
  } catch {
    /* trình duyệt không cho tần số này */
  }
  return env.createContext();
}

export function createPlayer(opts: { env?: AudioEnv } = {}): Player {
  const env = opts.env ?? browserAudioEnv;
  const context = createPlaybackContext(env);
  if (context.state === "suspended") void context.resume();

  const pending = new Set<AudioBufferSourceNode>();
  let nextStartTime = 0;
  let stopped = false;

  return {
    push(frame) {
      if (stopped) return;
      // Khung binary từ gateway dài tới 32000 byte (2 giây audio), không phải
      // luôn 20ms — nên không được giả định độ dài nào.
      //
      // Khung rỗng hoặc 1 byte thì bỏ hẳn: `createBuffer(1, 0, rate)` ném
      // NotSupportedError trên Web Audio thật, và một exception trong handler
      // `message` của socket giết luôn mọi frame SAU đó — mất cả phần còn lại của
      // cuộc gọi, không riêng khung hỏng này.
      if (frame.byteLength < 2) return;
      // Cắt byte thừa của khung lẻ. Dạng ba tham số `new Int16Array(buf, 0, n)`
      // vốn đã chịu được byteLength lẻ (khác dạng một tham số `new Int16Array(buf)`
      // — dạng đó ném RangeError vì byteLength không chia hết cho 2), nên dòng này
      // là để nói rõ ý định và để an toàn nếu ai đó đổi sang dạng một tham số.
      const usable = frame.byteLength - (frame.byteLength % 2);
      const samples = new Int16Array(frame, 0, usable / 2);

      const buffer = context.createBuffer(1, samples.length, VOICE_SAMPLE_RATE);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) channel[i] = samples[i]! / 0x8000;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      pending.add(source);
      source.onended = () => {
        pending.delete(source);
        source.disconnect();
      };

      // Đệm jitter: nếu lịch phát đã trôi vào quá khứ (mạng khựng), kéo nó về
      // hiện tại thay vì phát dồn mọi khung tồn đọng một lúc.
      const earliest = context.currentTime + JITTER_BUFFER_SEC;
      if (nextStartTime < earliest) nextStartTime = earliest;
      source.start(nextStartTime);
      nextStartTime += buffer.duration;
    },

    stop() {
      if (stopped) return;
      stopped = true;
      nextStartTime = 0;
      // Cắt tiếng đang phát NGAY khi cúp máy — chỉ `close()` context là chưa đủ:
      // audio đã lên lịch vẫn phát nốt trên một số trình duyệt, nên người dùng
      // bấm cúp rồi vẫn nghe agent nói thêm vài giây.
      for (const source of pending) {
        try {
          source.stop();
        } catch {
          /* đã dừng hoặc chưa từng start */
        }
      }
      pending.clear();
      void context.close();
    },
  };
}
