const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="relative grid size-[120px] place-items-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-200" />
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
          className="text-primary transition-[stroke-dashoffset] duration-1000"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-extrabold text-gray-900">{Math.round(clamped)}%</div>
        {label && <div className="text-[11px] text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}
