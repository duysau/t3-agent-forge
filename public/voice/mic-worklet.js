// AudioWorklet thu micro cho voice mode. Chạy trong AudioWorkletGlobalScope.
//
// Cổng: chuyển từ `../../hackathon/demo/mic-worklet.js` (module mẫu của gateway).
// Contract gateway: PCM s16le, 8000 Hz, mono, mỗi frame 20ms — xem
// `frontend-handoff-1.md` §1.3 và `../../hackathon/src/api/ws.ts` (`maxPayload`
// tính đúng theo khung 320 byte này).
//
// File này PHẢI tự chứa, không `import` gì: `audioWorklet.addModule()` nạp nó
// bằng URL tĩnh từ `public/`, không đi qua bundler. Test nạp đúng file này
// (`src/lib/voice/mic-worklet.test.ts`) nên không có bản sao nào để lệch.
//
// AudioContext đã ở 8000 Hz (trình duyệt tự hạ mẫu từ 48kHz của micro), nên việc
// còn lại chỉ là gom đủ 160 mẫu và đổi sang Int16.
const FRAME_SAMPLES = 160;

class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(FRAME_SAMPLES);
    this.filled = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    // Trả true kể cả khi chưa có input: process() phải sống suốt cuộc gọi. Trả
    // false là gỡ node khỏi đồ thị VĨNH VIỄN — micro im lặng phần còn lại của
    // cuộc gọi, không lỗi nào để lần theo.
    if (channel === undefined) return true;

    for (let i = 0; i < channel.length; i += 1) {
      this.buffer[this.filled] = channel[i];
      this.filled += 1;

      if (this.filled === FRAME_SAMPLES) {
        const frame = new Int16Array(FRAME_SAMPLES);
        for (let s = 0; s < FRAME_SAMPLES; s += 1) {
          const clamped = Math.max(-1, Math.min(1, this.buffer[s]));
          // Thang âm BẤT ĐỐI XỨNG: dải Int16 là [-32768, 32767], nên biên âm
          // nhân 0x8000 còn biên dương nhân 0x7fff. Dùng chung 0x8000 cho cả hai
          // thì mẫu +1.0 ra 32768, tràn và cuộn về -32768 — nghe thành tiếng tách
          // đúng lúc người dùng nói to nhất.
          frame[s] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        }
        // Chuyển quyền sở hữu buffer (transfer list) thay vì copy: 50 frame mỗi
        // giây, mỗi frame một ArrayBuffer mới.
        this.port.postMessage(frame.buffer, [frame.buffer]);
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor("mic-processor", MicProcessor);
