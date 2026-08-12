/**
 * Kiểm luồng voice bằng ĐÚNG client của app (không phải curl) đối đầu gateway thật.
 * Chạy: bun run probe:voice
 *
 * Mở một phiên voice, đẩy audio im lặng đúng định dạng worklet sinh ra (Int16,
 * 8kHz, 160 mẫu/frame), thu lại event và audio nhận về, rồi NHẢ phiên. Mục đích là
 * đóng giả định contract bằng quan sát, và để kiểm nhanh trước mỗi buổi demo rằng
 * gateway + profile + agent nền tảng đang sống.
 *
 * Có tốn thật: một cuộc gọi ngắn trên nền tảng và một slot CCU trong ~7 giây. Script
 * luôn gọi DELETE ở cuối, kể cả khi lỗi — không nhả là slot bị giữ tới 600 giây.
 */
import {
  audioSocketUrl,
  endConversation,
  openVoiceConversation,
} from "../src/lib/voice/gateway-client";
import { parseGatewayEvent } from "../src/lib/voice/events";

const BASE = process.env.NEXT_PUBLIC_VOICE_GATEWAY_URL ?? "http://127.0.0.1:8787";
const PROFILE = process.env.NEXT_PUBLIC_VOICE_PROFILE ?? "longchau";
const PUSH_MS = Number(process.env.PROBE_PUSH_MS ?? 6000);

const FRAME_SAMPLES = 160;
const FRAME_INTERVAL_MS = 20;

console.log(`gateway: ${BASE}`);
console.log(`profile: ${PROFILE}`);

const opened = await openVoiceConversation({ baseUrl: BASE, profile: PROFILE });
console.log(`201 mở phiên: ${opened.conversationId}`);
console.log(`  audioUrl: ${opened.audioUrl}`);
console.log(`  audioFormat: ${JSON.stringify(opened.audioFormat)} → ${opened.audioSampleRate}Hz`);

let audioFrames = 0;
let audioBytes = 0;
const events: string[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

try {
  const wsUrl = audioSocketUrl(BASE, opened.audioUrl);
  console.log(`  ws: ${wsUrl}`);
  const socket = new WebSocket(wsUrl);
  socket.binaryType = "arraybuffer";

  socket.addEventListener("message", (message: MessageEvent<unknown>) => {
    if (typeof message.data !== "string") {
      audioFrames += 1;
      audioBytes += (message.data as ArrayBuffer).byteLength;
      return;
    }
    const event = parseGatewayEvent(message.data);
    events.push(
      event === null
        ? `KHÔNG PARSE ĐƯỢC: ${message.data}`
        : JSON.stringify(event).slice(0, 200),
    );
  });
  socket.addEventListener("close", (e: CloseEvent) =>
    console.log(`ws đóng: code=${e.code} reason="${e.reason}"`),
  );

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve());
    socket.addEventListener("error", () => reject(new Error("ws không mở được")));
    setTimeout(() => reject(new Error("hết thời gian chờ ws open")), 8000);
  });
  console.log("ws mở");

  // Agent chỉ mở lời sau khi NGHE thấy dòng audio, nên phải đẩy liên tục kể cả khi
  // im lặng — đúng hành vi của `useVoiceCall`.
  const frame = new Int16Array(FRAME_SAMPLES);
  timer = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) socket.send(frame.buffer);
  }, FRAME_INTERVAL_MS);

  await new Promise((r) => setTimeout(r, PUSH_MS));
  clearInterval(timer);
  timer = null;

  console.log(`\nnhận ${audioFrames} frame audio, ${audioBytes} byte`);
  console.log("event nhận được:");
  for (const line of events) console.log(`  ${line}`);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "end" }));
    socket.close();
  }
} finally {
  if (timer !== null) clearInterval(timer);
  await endConversation({ baseUrl: BASE, conversationId: opened.conversationId });
  console.log("DELETE ok — slot đã nhả");
}
