"use client";

import { env } from "~/env";
import { useVoiceCall } from "~/hooks/use-voice-call";
import { VoiceDemoView } from "./voice-demo-view";

/**
 * Cuộc gọi thoại thử ngay trong trình duyệt, nối THẲNG tới gateway voice.
 *
 * Không có gì trong luồng này đi qua tRPC: audio là WebSocket (Next không proxy
 * được), và lệnh nhả phiên lúc đóng tab phải là fetch `keepalive` phát từ chính
 * browser. Xem `~/lib/voice/gateway-client`.
 *
 * KB được đẩy lên agent voice trong lượt build `product: "voice"` — backend tự làm
 * và báo lại qua `voicePublish` ở Bước 3. Màn này không còn nút publish tay; nếu
 * cần đẩy lại KB cho một agent đã build sẵn thì gọi `agent.publishVoice`.
 *
 * KHÔNG nhận `slug`: sau khi gỡ nút publish, cuộc gọi không còn cần biết agent nào
 * — nó nói với agent voice dùng chung của nền tảng, và thứ duy nhất đi kèm là tên
 * thương hiệu trong `attributes`. Một prop không ai đọc là bẫy cho lần sửa sau.
 */
export function VoiceDemo({ brandName }: { brandName: string | null }) {
  const baseUrl = env.NEXT_PUBLIC_VOICE_GATEWAY_URL ?? "";

  const call = useVoiceCall({
    baseUrl,
    profile: env.NEXT_PUBLIC_VOICE_PROFILE,
    // Gateway chuyển `attributes` NGUYÊN VĂN lên nền tảng, nên đây là chỗ duy nhất
    // agent biết nó đang nói thay thương hiệu nào trong lượt gọi này — agent voice
    // là agent dùng chung, tên thương hiệu không nằm trong cấu hình của nó.
    attributes: brandName !== null ? { brand: brandName } : undefined,
  });

  return (
    <VoiceDemoView
      configured={baseUrl !== ""}
      status={call.status}
      error={call.error}
      endedReason={call.endedReason}
      transcript={call.transcript}
      agentSpeaking={call.agentSpeaking}
      onCall={() => void call.start()}
      onHangUp={() => void call.hangUp()}
    />
  );
}
