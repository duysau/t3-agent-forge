export interface TerminalLine {
  kind: "info" | "ok" | "warn";
  text: string;
}

const TONE: Record<TerminalLine["kind"], string> = {
  info: "text-term-dim",
  ok: "text-term-green",
  warn: "text-term-yellow",
};

/**
 * Terminal in dòng tại các mốc THẬT của promise, không mô phỏng tiến độ.
 * Backend không stream gì: build là một call blocking tới 300s (build `voice`
 * còn đẩy KB lên agent voice nền tảng, mất ~2-3 phút), eval cũng tới 300s — nên
 * mọi phần trăm ở đây đều là bịa. Giữa hai mốc chỉ có nhãn và số giây đã trôi.
 */
export function BuildTerminal({
  lines,
  busy,
}: {
  lines: TerminalLine[];
  busy: { label: string; elapsedSeconds: number } | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-term-bg shadow-lg">
      <div className="flex items-center gap-[7px] border-b border-term-border bg-term-bar px-4 py-3">
        <span className="size-3 rounded-full bg-destructive" />
        <span className="size-3 rounded-full bg-warning" />
        <span className="size-3 rounded-full bg-success" />
        <span className="ml-2.5 font-mono text-[13px] text-term-dim">agentforge · build</span>
      </div>
      <ul className="max-h-[340px] min-h-[230px] space-y-1 overflow-y-auto px-5 py-[18px] font-mono text-sm leading-[1.85] text-term-fg">
        {lines.map((line, i) => (
          <li key={`${i}-${line.text}`} className={TONE[line.kind]}>
            {line.text}
          </li>
        ))}
        {busy && (
          <li className="flex items-center gap-2 text-term-blue">
            <span className="size-1.5 animate-pulse rounded-full bg-term-blue" />
            {busy.label}
            <span className="text-term-dim">· {busy.elapsedSeconds} giây</span>
          </li>
        )}
      </ul>
    </div>
  );
}
