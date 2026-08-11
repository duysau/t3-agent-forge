export type ErrorKind =
  | "bad_request"
  | "session_missing"
  | "upstream"
  | "internal"
  | "timeout"
  | "network"
  | "contract";

export class AgentForgeError extends Error {
  readonly kind: ErrorKind;
  readonly detail: string | null;
  readonly status: number | null;
  readonly raw?: unknown;

  constructor(kind: ErrorKind, detail: string | null, status: number | null, raw?: unknown) {
    super(`[agentforge:${kind}]${detail ? ` ${detail}` : ""}`);
    this.name = "AgentForgeError";
    this.kind = kind;
    this.detail = detail;
    this.status = status;
    this.raw = raw;
  }
}

export function kindFromStatus(status: number): ErrorKind {
  // 422 là lỗi validation của Pydantic/FastAPI — đầu vào của ta sai, không phải backend chết.
  if (status === 400 || status === 422) return "bad_request";
  if (status === 404) return "session_missing";
  if (status >= 502) return "upstream";
  return "internal";
}

interface ValidationIssue {
  loc?: unknown[];
  msg?: string;
}

/**
 * `detail` của FastAPI có hai hình dạng: chuỗi cho lỗi ta tự raise, và **array**
 * `[{loc, msg, type}]` cho lỗi validation 422. `String(detail)` trên array cho ra
 * "[object Object]" — vô dụng đúng lúc cần nhất.
 */
export function extractDetail(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.length > 0) return payload;
  if (payload === null || typeof payload !== "object") return `HTTP ${status}`;

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.length > 0) return detail;

  if (Array.isArray(detail)) {
    const lines = (detail as ValidationIssue[]).map((issue) => {
      const path = Array.isArray(issue.loc) ? issue.loc.join(".") : "";
      const msg = issue.msg ?? "không hợp lệ";
      return path ? `${path}: ${msg}` : msg;
    });
    if (lines.length > 0) return lines.join("; ");
  }

  return `HTTP ${status}`;
}

export function isSessionMissing(err: unknown): boolean {
  return err instanceof AgentForgeError && err.kind === "session_missing";
}

const FALLBACK_KINDS: ReadonlySet<ErrorKind> = new Set(["upstream", "network", "timeout"]);

export function isFallbackWorthy(err: unknown): boolean {
  return err instanceof AgentForgeError && FALLBACK_KINDS.has(err.kind);
}
