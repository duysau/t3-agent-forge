/**
 * Vòng đời status của agent: `draft` → `built` → `evaluated`. Cột `status` là
 * `varchar` nên đây là chỗ duy nhất biết các giá trị đó nghĩa là gì.
 *
 * `demo.bySlug` cố tình phục vụ cả agent chưa dựng, để trang demo hiện được
 * trạng thái dở dang thay vì một lỗi. Nhưng "dở dang" phải được NÓI RA: một
 * agent ở `draft` chưa có system prompt, nên ô chat trên nó chỉ có thể trả lời
 * bằng một prompt rỗng.
 */
export function isAgentBuilt(status: string): boolean {
  return status === "built" || status === "evaluated";
}

/** Message cho `chat.send` khi agent chưa dựng. Thủ tục, không phải phép lịch sự. */
export const AGENT_NOT_BUILT_MESSAGE =
  "Agent chưa dựng xong — hãy hoàn thành Bước 3 (dựng & kiểm định) trước khi chat.";
