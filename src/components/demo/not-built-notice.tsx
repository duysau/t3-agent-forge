/**
 * Thay cho ô chat khi agent chưa dựng xong.
 *
 * Một link demo chia sẻ ngay sau Bước 1 vẫn mở được — trang này đọc Postgres và
 * không phụ thuộc backend. Nhưng agent lúc đó chưa có system prompt, nên một ô
 * chat ở đó là lời hứa sai: người xem gõ câu hỏi và nhận về câu trả lời của một
 * agent rỗng. Nói thẳng rằng nó chưa xong thì trung thực hơn.
 */
export function NotBuiltNotice() {
  return (
    <div data-testid="not-built-notice" className="bg-card px-5 py-8 text-center">
      <p className="text-sm font-bold text-gray-900">Agent chưa dựng xong</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-muted-foreground">
        Trang demo này đã có sẵn link, nhưng agent chưa được dựng và kiểm định nên chưa thể chat.
        Hãy quay lại sau khi người tạo hoàn thành bước dựng &amp; kiểm định.
      </p>
    </div>
  );
}
