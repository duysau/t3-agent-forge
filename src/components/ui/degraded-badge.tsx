import { TriangleAlert } from "lucide-react";
import { Badge } from "./badge";

/**
 * Hai lý do khác nhau dẫn tới cùng một sự thật "đây là dữ liệu mẫu":
 *
 * - `fallback` — đã thử dữ liệu thật và **thất bại**, rồi tụt hạng xuống fixture.
 * - `chosen` — người dùng **chủ động** chọn kịch bản mẫu chạy offline ở Bước 1.
 *
 * Phải nói đúng lý do: trình bày một lựa chọn có chủ đích như một thất bại là sai,
 * và trình bày dữ liệu mẫu như dữ liệu thật cũng sai. Nhãn thay đổi, nguyên tắc thì không.
 */
export type SampleDataReason = "fallback" | "chosen";

const COPY: Record<SampleDataReason, string> = {
  fallback: "Dữ liệu mẫu — không lấy được dữ liệu thật",
  chosen: "Dữ liệu mẫu — kịch bản chạy offline",
};

export function DegradedBadge({ reason = "fallback" }: { reason?: SampleDataReason }) {
  return (
    <Badge variant="warning">
      <TriangleAlert className="size-3" />
      {COPY[reason]}
    </Badge>
  );
}
