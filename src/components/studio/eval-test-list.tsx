"use client";

import { useState } from "react";
import { Check, Pencil, TriangleAlert } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { StoredEvalResult } from "~/server/db/queries/eval";

type Filter = "all" | "grounded" | "trap" | "edge" | "fail";

/**
 * `icon` thay cho ký tự "⚠" dán vào chuỗi nhãn: emoji/ký hiệu Unicode render khác
 * nhau tuỳ font hệ thống, không đổi màu theo trạng thái nút, và bị screen reader
 * đọc thành "dấu chấm than trong tam giác" ngay giữa tên bộ lọc. SVG thì không.
 */
const FILTERS: Array<{ key: Filter; label: string; icon?: typeof TriangleAlert }> = [
  { key: "all", label: "Tất cả" },
  { key: "grounded", label: "Grounded" },
  { key: "trap", label: "Câu bẫy" },
  { key: "edge", label: "Edge case" },
  { key: "fail", label: "Cần bổ sung KB", icon: TriangleAlert },
];

const CAT: Record<StoredEvalResult["category"], { label: string; cls: string }> = {
  grounded: { label: "grounded", cls: "bg-fci-50 text-fci-700" },
  trap: { label: "câu bẫy", cls: "bg-warning-muted text-warning-strong" },
  edge: { label: "edge case", cls: "bg-cat-edge-bg text-cat-edge-fg" },
};

export interface EvalTestListProps {
  results: StoredEvalResult[];
  /**
   * Lưu câu trả lời đã sửa. Vắng mặt thì danh sách chỉ để đọc — đó là trạng thái
   * của trang demo công khai `/s/[slug]`, nơi người xem không được sửa bảng điểm
   * của người khác. Sửa được hay không do NƠI DÙNG quyết định, không phải component.
   */
  onSaveAnswer?: (ord: number, answer: string) => Promise<void>;
}

export function EvalTestList({ results, onSaveAnswer }: EvalTestListProps) {
  const [filter, setFilter] = useState<Filter>("all");
  /**
   * Neo theo vị trí trong `results` GỐC, không theo vị trí trong danh sách đã lọc.
   * Neo vào danh sách đã lọc là một lỗi thật: mở bài 01 ở "Tất cả" rồi bấm
   * "Cần bổ sung KB" sẽ thấy bài còn lại mở sẵn — phơi ra câu trả lời mà người
   * dùng chưa hề yêu cầu xem — và lọt theo cả chiều ngược lại. Prototype không gặp
   * chuyện này vì nó lọc bằng `display:none`, class `.tc.open` vẫn dính đúng dòng.
   *
   * Chỉ số gốc là mốc ổn định ở đây vì `results` không đổi trong suốt một lượt sống
   * của component: Bước 3 ẩn cả bảng điểm (`evalSummary` về null) khi dựng lại, nên
   * component unmount và state gập được dựng lại từ đầu cùng bộ kết quả mới.
   */
  const [open, setOpen] = useState<Set<number>>(new Set());

  /**
   * Bài đang được sửa, neo theo `ord` — địa chỉ bền của hàng trong DB, cũng là thứ
   * mutation gửi lên. Neo theo vị trí trong mảng thì đổi filter sẽ kéo ô nhập sang
   * bài khác, đúng loại lỗi mà `open` ở trên đã tránh; ở đây hậu quả nặng hơn: bản
   * nháp đang gõ dở sẽ được lưu đè lên một bài không liên quan.
   *
   * Chỉ cho sửa MỘT bài tại một thời điểm. Nhiều ô nháp mở cùng lúc thì "Huỷ" và
   * "Lưu" không còn nghĩa rõ ràng, và người dùng dễ bỏ quên một ô chưa lưu.
   */
  const [editing, setEditing] = useState<{ ord: number; draft: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = (ord: number, answer: string) => {
    setEditing({ ord, draft: answer });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setSaveError(null);
  };

  const save = async () => {
    if (!editing || !onSaveAnswer) return;

    const answer = editing.draft.trim();
    // Cùng luật với `z.string().trim().min(1)` ở server. Chặn tại đây để người dùng
    // thấy lý do ngay tại ô đang gõ, thay vì đợi một vòng mạng chỉ để bị từ chối.
    if (!answer) {
      setSaveError("Câu trả lời không được để trống");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await onSaveAnswer(editing.ord, answer);
      // Chỉ đóng ô nhập SAU khi lưu thành công. Đóng sớm rồi mới biết lỗi là ném mất
      // đoạn người dùng vừa gõ, và họ không có cách nào lấy lại.
      setEditing(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Lưu không thành công");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (index: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  /** Giữ kèm chỉ số gốc để cả trạng thái gập và số thứ tự đều không đổi khi lọc. */
  const shown = results
    .map((r, index) => ({ r, index }))
    .filter(({ r }) => {
      if (filter === "all") return true;
      if (filter === "fail") return !r.passed;
      return r.category === filter;
    });

  return (
    <div className="mt-6">
      <div role="group" aria-label="Bộ lọc bài kiểm định" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              // `aria-pressed` để screen reader biết đây là nút BẬT/TẮT và cái nào
              // đang bật — màu nền là tín hiệu duy nhất cho việc đó, mà màu thì
              // không đọc được.
              aria-pressed={active}
              onClick={() => setFilter(f.key)}
              className={cn(
                // `min-h-9` + `cursor-pointer` + vòng focus: trước đó nhóm nút này
                // cao ~29px, không có chỉ báo focus, và không đổi con trỏ chuột.
                "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-gray-300 bg-surface px-3.5 text-[13px] font-semibold text-gray-600 transition-colors outline-none hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-ring/50",
                active && "border-fci-500 bg-fci-500 text-white hover:bg-fci-600",
              )}
            >
              {Icon && <Icon aria-hidden className="size-3.5" />}
              {f.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 space-y-2">
        {shown.map(({ r, index }) => (
          <li
            key={`${r.category}-${index}-${r.question}`}
            data-testid="eval-row"
            className={cn(
              "overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-sm",
              !r.passed && "border-warning/50 bg-warning-muted",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              aria-expanded={open.has(index)}
              className="flex w-full items-center gap-3 px-4 py-[13px] text-left"
            >
              <span className="w-6 shrink-0 font-mono text-xs text-gray-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-800">{r.question}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", CAT[r.category].cls)}>
                {CAT[r.category].label}
              </span>
              <span className="w-[42px] shrink-0 text-right font-mono text-[13px] font-bold">{r.score}/5</span>
              {r.passed ? (
                <Check className="size-[22px] shrink-0 text-success" />
              ) : (
                <TriangleAlert className="size-[22px] shrink-0 text-warning" />
              )}
            </button>
            {open.has(index) && (
              <div className="animate-panel-fade pr-4 pb-4 pl-[52px] text-sm text-gray-600">
                {editing?.ord === r.ord ? (
                  <div className="my-2">
                    <label htmlFor={`answer-${r.ord}`} className="sr-only">
                      Sửa câu trả lời
                    </label>
                    <textarea
                      id={`answer-${r.ord}`}
                      value={editing.draft}
                      onChange={(e) => setEditing({ ord: r.ord, draft: e.target.value })}
                      // Escape huỷ, giống mọi ô nhập tạm khác. KHÔNG bắt Enter để lưu:
                      // đây là ô nhiều dòng, câu trả lời thật có xuống dòng, nên Enter
                      // phải là xuống dòng.
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelEdit();
                      }}
                      disabled={saving}
                      rows={6}
                      autoFocus
                      className={cn(
                        "w-full resize-y rounded-md border border-fci-500 bg-surface px-3.5 py-3 leading-relaxed text-gray-700",
                        "outline-none focus:ring-2 focus:ring-fci-500/30 disabled:opacity-60",
                      )}
                    />
                    {saveError && (
                      <p role="alert" className="mt-2 text-[13px] text-error-strong">
                        {saveError}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" onClick={() => void save()} disabled={saving}>
                        {saving ? "Đang lưu…" : "Lưu"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={cancelEdit} disabled={saving}>
                        Huỷ
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className={cn(
                        "my-2 rounded-md border border-border bg-gray-25 px-3.5 py-3 leading-relaxed whitespace-pre-wrap text-gray-700",
                        !r.passed && "border-destructive/35 bg-error-muted",
                      )}
                    >
                      {r.answer}
                    </p>
                    {onSaveAnswer && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mb-2"
                        onClick={() => startEdit(r.ord, r.answer)}
                        // Đang lưu bài khác thì không mở ô nhập thứ hai — `editing` chỉ
                        // giữ được một bản nháp, và bấm sang bài khác sẽ vứt bản nháp đó.
                        disabled={saving}
                      >
                        <Pencil className="size-3.5" />
                        Sửa câu trả lời
                      </Button>
                    )}
                  </>
                )}
                {r.reasoning && <p className="flex items-start gap-2 text-gray-500 italic">{r.reasoning}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
