import { toast } from "sonner";

/**
 * Một cửa duy nhất cho toast. Lý do có file này thay vì gọi `toast` rải rác:
 * toast chỉ được dùng cho việc CHƯA CÓ chỗ hiển thị nào. Nút sao chép đã có
 * nhãn "Đã sao chép" và đã có thông báo khi clipboard bị từ chối; thêm toast
 * ở đó là nói hai lần cùng một chuyện.
 */
export function notifyOk(message: string): void {
  toast.success(message);
}
