export interface TerminalLine {
  kind: "info" | "ok" | "warn";
  text: string;
}

const TONE: Record<TerminalLine["kind"], string> = {
  info: "text-gray-400",
  ok: "text-success",
  warn: "text-warning",
};

/**
 * Terminal in dòng tại các mốc THẬT của promise, không mô phỏng tiến độ.
 * Backend không stream gì: build là một call blocking tới 60s, eval tới 300s —
 * nên mọi phần trăm ở đây đều là bịa. Giữa hai mốc chỉ có nhãn và số giây đã trôi.
 */
export function BuildTerminal({
  lines,
  busy,
}: {
  lines: TerminalLine[];
  busy: { label: string; elapsedSeconds: number } | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <div className="flex items-center gap-1.5 border-b border-gray-800 px-3 py-2">
        <span className="size-2.5 rounded-full bg-destructive" />
        <span className="size-2.5 rounded-full bg-warning" />
        <span className="size-2.5 rounded-full bg-success" />
        <span className="ml-2 font-mono text-xs text-gray-400">agentforge · build</span>
      </div>
      <ul className="space-y-1 p-4 font-mono text-[13px]">
        {lines.map((line, i) => (
          <li key={`${i}-${line.text}`} className={TONE[line.kind]}>
            {line.text}
          </li>
        ))}
        {busy && (
          <li className="flex items-center gap-2 text-fci-300">
            <span className="size-1.5 animate-pulse rounded-full bg-fci-300" />
            {busy.label}
            <span className="text-gray-500">· {busy.elapsedSeconds} giây</span>
          </li>
        )}
      </ul>
    </div>
  );
}
