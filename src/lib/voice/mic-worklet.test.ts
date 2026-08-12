import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Đường dẫn dựng từ `process.cwd()` (gốc project, nơi có `vitest.config.ts`),
 * KHÔNG từ `import.meta.url`: Vite phục vụ module qua http nên `import.meta.url`
 * trong test là một URL `http://`, và `new URL(..., đó)` không ra được đường dẫn
 * đĩa nào — `readFileSync` ném "The URL must be of scheme file".
 */
const WORKLET_PATH = resolve(process.cwd(), "public/voice/mic-worklet.js");

/**
 * Nạp CHÍNH file worklet sẽ chạy trên trình duyệt (`public/voice/mic-worklet.js`)
 * rồi chạy nó với hai global mà `AudioWorkletGlobalScope` cung cấp.
 *
 * Vì sao không tách logic sang một module TS rồi test module đó: worklet được
 * `audioWorklet.addModule()` nạp bằng URL tĩnh, KHÔNG đi qua bundler — nên một
 * module TS dùng chung sẽ phải nhân đôi thành hai bản, và bản không được test là
 * đúng bản chạy thật. Nạp file thật ở đây đắt hơn vài dòng nhưng không có bản sao.
 *
 * Điều kiện đi kèm: file worklet phải TỰ CHỨA, không `import` gì.
 */
function loadWorklet(): { name: string; create: () => WorkletProcessor } {
  const source = readFileSync(WORKLET_PATH, "utf8");

  const frames: ArrayBuffer[] = [];
  class FakeAudioWorkletProcessor {
    readonly port = {
      postMessage: (data: ArrayBuffer) => frames.push(data),
    };
  }

  let registeredName = "";
  let Ctor: (new () => WorkletProcessor) | null = null;

  const run = new Function(
    "AudioWorkletProcessor",
    "registerProcessor",
    source,
  ) as (
    base: typeof FakeAudioWorkletProcessor,
    register: (name: string, ctor: new () => WorkletProcessor) => void,
  ) => void;

  run(FakeAudioWorkletProcessor, (name, ctor) => {
    registeredName = name;
    Ctor = ctor;
  });

  if (Ctor === null) throw new Error("worklet không gọi registerProcessor");
  const create = Ctor as new () => WorkletProcessor;

  return {
    name: registeredName,
    create: () => {
      frames.length = 0;
      const processor = new create();
      // Mỗi processor đọc frame của riêng nó qua mảng dùng chung ở trên; test
      // nào cũng tạo processor mới nên không có chuyện lẫn frame giữa hai lượt.
      processor.collected = frames;
      return processor;
    },
  };
}

interface WorkletProcessor {
  process(inputs: Float32Array[][]): boolean;
  collected: ArrayBuffer[];
}

/** Đẩy một khối mẫu vào worklet đúng cách trình duyệt làm: từng block 128 mẫu. */
function pushBlocks(processor: WorkletProcessor, samples: Float32Array, blockSize = 128): void {
  for (let offset = 0; offset < samples.length; offset += blockSize) {
    processor.process([[samples.subarray(offset, offset + blockSize)]]);
  }
}

function framesToSamples(frames: ArrayBuffer[]): number[] {
  return frames.flatMap((buffer) => Array.from(new Int16Array(buffer)));
}

const FRAME_SAMPLES = 160;

describe("mic-worklet", () => {
  it("đăng ký đúng tên mic-processor mà AudioWorkletNode dựng theo", () => {
    // Lệch tên ở đây là `new AudioWorkletNode(context, "mic-processor")` ném
    // InvalidStateError ngay lúc bấm Gọi — sau khi đã chiếm micro.
    expect(loadWorklet().name).toBe("mic-processor");
  });

  it("gom đúng 160 mẫu (20ms ở 8kHz) mỗi frame, không gửi frame ngắn", () => {
    const worklet = loadWorklet();
    const processor = worklet.create();

    // 128 mẫu: chưa đủ một frame.
    pushBlocks(processor, new Float32Array(128));
    expect(processor.collected).toHaveLength(0);

    // Thêm 128 mẫu nữa (tổng 256) → đúng một frame, 96 mẫu còn lại nằm đệm.
    pushBlocks(processor, new Float32Array(128));
    expect(processor.collected).toHaveLength(1);
    expect(new Int16Array(processor.collected[0]!)).toHaveLength(FRAME_SAMPLES);
  });

  it("không mất mẫu nào ở biên giữa hai block", () => {
    const worklet = loadWorklet();
    const processor = worklet.create();

    // Mỗi mẫu một giá trị riêng biệt để phát hiện mất/lặp: i/1000 nằm gọn trong
    // [-1, 1] nên không bị kẹp, và mỗi bậc cách nhau đủ xa sau khi lượng tử hoá.
    const total = 512;
    const input = new Float32Array(total);
    for (let i = 0; i < total; i += 1) input[i] = i / 1000;

    pushBlocks(processor, input);

    const out = framesToSamples(processor.collected);
    // 512 mẫu = 3 frame trọn (480), 32 mẫu còn lại vẫn nằm trong đệm.
    expect(out).toHaveLength(3 * FRAME_SAMPLES);
    const expected = Array.from(input.subarray(0, 3 * FRAME_SAMPLES), (v) =>
      Math.round(v * 0x7fff),
    );
    // Sai số 1 đơn vị vì Int16Array cắt phần thập phân thay vì làm tròn.
    out.forEach((value, i) => expect(Math.abs(value - expected[i]!)).toBeLessThanOrEqual(1));
  });

  /**
   * Dải Int16 là [-32768, 32767] — BẤT ĐỐI XỨNG. Nhân chung `0x8000` cho cả hai
   * biên làm mẫu +1.0 ra 32768, tràn và cuộn về -32768: nghe thành tiếng tách
   * đúng lúc người dùng nói to nhất.
   */
  it("mẫu +1.0 thành 32767 chứ không tràn về âm, -1.0 thành -32768", () => {
    const worklet = loadWorklet();
    const processor = worklet.create();

    const input = new Float32Array(FRAME_SAMPLES);
    input.fill(1);
    input[0] = -1;
    pushBlocks(processor, input, FRAME_SAMPLES);

    const out = new Int16Array(processor.collected[0]!);
    expect(out[0]).toBe(-32768);
    expect(out[1]).toBe(32767);
  });

  it("kẹp giá trị vượt biên thay vì để nó cuộn vòng", () => {
    const worklet = loadWorklet();
    const processor = worklet.create();

    const input = new Float32Array(FRAME_SAMPLES);
    input.fill(0);
    input[0] = 4.5;
    input[1] = -4.5;
    pushBlocks(processor, input, FRAME_SAMPLES);

    const out = new Int16Array(processor.collected[0]!);
    expect(out[0]).toBe(32767);
    expect(out[1]).toBe(-32768);
  });

  /**
   * `process()` trả `false` là gỡ node khỏi đồ thị VĨNH VIỄN — micro im lặng
   * suốt phần còn lại của cuộc gọi, không có lỗi nào để lần theo. Một lượt gọi
   * chưa có input (đồ thị vừa dựng xong) không được phép gây ra chuyện đó.
   */
  it("trả true kể cả khi chưa có input để không bị gỡ khỏi đồ thị", () => {
    const worklet = loadWorklet();
    const processor = worklet.create();

    expect(processor.process([])).toBe(true);
    expect(processor.process([[]])).toBe(true);
  });
});
