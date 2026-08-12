import { z } from "zod";

const booleanFromString = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .default(true)
  .transform((v) => (typeof v === "boolean" ? v : v === "true"));

export const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  PYTHON_API_URL: z.string().url(),
  FALLBACK_TO_FIXTURE: booleanFromString,
  // Trần giữ ở 20 — đúng trần backend nhận — theo quyết định của chủ dự án, dù
  // `frontend-handoff-1.md` §2.1 khuyên frontend đừng gửi quá 10: 20 trang mất
  // ~4 phút và có thể vượt budget fetch 3 phút của chính backend. Lưu ý đi kèm:
  // `TIMEOUTS.crawl` là 180s, nên với site nhiều trang client sẽ abort trước khi
  // backend crawl xong. Đây là đánh đổi đã biết, không phải sơ suất.
  CRAWL_MAX_PAGES: z.coerce.number().int().min(1).max(20).default(5),
});

export const clientSchema = z.object({
  /**
   * Gateway của nền tảng FPT Voice Agent. Browser nối THẲNG tới đây — WebSocket
   * không proxy qua Next được, và lệnh DELETE lúc đóng tab phải phát từ chính
   * browser (fetch keepalive). Gateway giữ API key phía nó nên URL này không lộ
   * bí mật nào.
   *
   * `.optional()` có chủ đích: gateway là một tiến trình riêng, thường chỉ dựng
   * trên máy demo. Bắt buộc biến này nghĩa là một máy không chạy voice thì không
   * boot được cả app — biến một tính năng thiếu thành một app chết. Thiếu thì UI
   * nói "voice chưa cấu hình".
   *
   * (Đã thay `NEXT_PUBLIC_PYTHON_WS_URL`: `/ws/voice/{session_id}` của backend
   * Python — spec §9 — chưa từng tồn tại và giờ không còn được lên kế hoạch.)
   */
  NEXT_PUBLIC_VOICE_GATEWAY_URL: z.string().url().optional(),
  /**
   * Tên Agent Profile trên gateway. KHÔNG hardcode: profile được nạp từ
   * `agents.local.yaml`/`agents.generated.yaml` của từng máy chạy gateway, nên
   * tên khác nhau theo máy — gateway đang chạy lúc viết dòng này nạp
   * `forge-mspq0g3v1` chứ không có `longchau` mà `frontend-handoff-1.md` §1.1
   * ghi. Gửi sai tên thì gateway trả 404 `unknown_profile`.
   */
  NEXT_PUBLIC_VOICE_PROFILE: z.string().min(1).default("longchau"),
});
