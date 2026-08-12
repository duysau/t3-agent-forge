const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="relative grid size-[120px] place-items-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="10" className="text-white/20" />
        <circle
          data-testid="score-ring-arc"
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          /*
            Giữ 1000ms — dài hơn ngưỡng 150-300ms của micro-interaction, nhưng đây
            không phải đổi trạng thái UI mà là một lượt "quét" số điểm từ 0 tới giá
            trị thật; chính khoảng thời gian đó mới làm con số đọc được như một kết
            quả vừa được tính. `motion-reduce:transition-none` để người tắt animation
            thấy ngay giá trị cuối thay vì chờ.
          */
          className="text-white transition-[stroke-dashoffset] duration-1000 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-[32px] font-extrabold leading-none text-white">{Math.round(clamped)}%</div>
        {label && <div className="text-[11px] text-white/80">{label}</div>}
      </div>
    </div>
  );
}
