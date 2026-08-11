import { RotateCcw } from "lucide-react";

export function StudioHead({ onReset, canReset }: { onReset: () => void; canReset: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
      <div>
        <h2 className="text-[26px] font-extrabold tracking-[-0.02em]">AgentForge Studio</h2>
        <p className="mt-1 text-[15px] text-gray-500">
          Bốn bước từ website tới AI Agent đã kiểm định.
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={!canReset}
        title="Quay về Bước 1. Dữ liệu đã lưu không xoá — chỉ luồng trên máy bạn về đầu."
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-[13px] font-semibold text-gray-700 shadow-xs transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
      >
        <RotateCcw className="size-4" />
        Bắt đầu lại
      </button>
    </div>
  );
}
