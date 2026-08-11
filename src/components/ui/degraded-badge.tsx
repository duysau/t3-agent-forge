import { TriangleAlert } from "lucide-react";
import { Badge } from "./badge";

/**
 * Tụt hạng phải nhìn thấy được. Không bao giờ trình bày dữ liệu mẫu như thể
 * nó là dữ liệu thật — kể cả trên sân khấu.
 */
export function DegradedBadge() {
  return (
    <Badge variant="warning">
      <TriangleAlert className="size-3" />
      Dữ liệu mẫu — không lấy được dữ liệu thật
    </Badge>
  );
}
