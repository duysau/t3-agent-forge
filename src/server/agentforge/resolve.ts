import { createClient } from "./client";
import { isFallbackWorthy } from "./errors";
import { createFixtureSource } from "./fixture-source";
import { logBoundary } from "./log";
import { createLiveSource, type AgentForgeSource } from "./source";
import {
  DEFAULT_FIXTURE_KEY,
  fixtureKeyForUrl,
  isFixtureKey,
  type FixtureKey,
} from "~/lib/fixtures";

export function resolveSource(input: {
  mode: "live" | "fixture";
  fixtureKey?: FixtureKey;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): AgentForgeSource {
  if (input.mode === "fixture") {
    return createFixtureSource(input.fixtureKey ?? DEFAULT_FIXTURE_KEY);
  }
  return createLiveSource(createClient({ baseUrl: input.baseUrl, fetchImpl: input.fetchImpl }));
}

/**
 * Nguồn dữ liệu cho một agent ĐÃ TỒN TẠI: quyết định bởi `mode`/`fixtureKey` đã
 * lưu trên row, không phải bởi `ctx.source`.
 *
 * `createTRPCContext` luôn dựng `ctx.source` ở chế độ live. Người dùng chọn
 * "kịch bản mẫu (chạy offline)" ở Bước 1 và `source.crawl` ghi lựa chọn đó xuống
 * DB — nếu build/eval/chat vẫn dùng `ctx.source`, đúng con đường tồn tại VÌ
 * backend chết lại chết ở Bước 3. Cùng lý lẽ với `product` trong `agent.build`:
 * hình thái agent đọc từ DB, không nhận lại từ client và không đoán từ context.
 *
 * `live` là nguồn dùng khi row nói `mode = "live"` — truyền `ctx.source` vào để
 * test vẫn ghi đè được từng method.
 */
export function sourceForAgent(
  agent: { mode: string; fixtureKey: string | null },
  live: AgentForgeSource,
): AgentForgeSource {
  if (agent.mode !== "fixture") return live;
  return createFixtureSource(isFixtureKey(agent.fixtureKey) ? agent.fixtureKey : DEFAULT_FIXTURE_KEY);
}

export interface WithFallbackOptions {
  source: AgentForgeSource;
  sourceUrl: string;
  /** `env.FALLBACK_TO_FIXTURE`. Tắt để lỗi thật nổi lên trong lúc phát triển. */
  enabled: boolean;
}

export interface FallbackOutcome<T> {
  data: T;
  degraded: boolean;
  fixtureKey: FixtureKey | null;
}

/**
 * Chạy `fn` trên nguồn live; nếu vỡ vì backend/mạng/timeout thì chạy lại trên
 * fixture và báo `degraded`. Chỉ ba loại lỗi đó được tụt hạng: `bad_request` là
 * lỗi đầu vào, `contract` là tín hiệu backend đổi — cả hai phải nổi lên để
 * người ta thấy, không được che bằng dữ liệu mẫu.
 *
 * Hợp đồng với `fn`: trên đường tụt hạng, `fn` bị gọi **hai lần** — một lần
 * trên nguồn live, một lần trên fixture. `fn` phải an toàn khi gọi lại: không
 * side effect nào ngoài các lệnh gọi trên `source` mà nó nhận, và người gọi
 * không được giả định `fn` chỉ chạy đúng một lần.
 */
export async function withFallback<T>(
  opts: WithFallbackOptions,
  fn: (source: AgentForgeSource) => Promise<T>,
): Promise<FallbackOutcome<T>> {
  try {
    return { data: await fn(opts.source), degraded: false, fixtureKey: null };
  } catch (err) {
    if (!opts.enabled || opts.source.kind === "fixture" || !isFallbackWorthy(err)) throw err;

    const fixtureKey = fixtureKeyForUrl(opts.sourceUrl);
    logBoundary("fallback:degraded", {
      fixtureKey,
      sourceUrl: opts.sourceUrl,
      cause: err instanceof Error ? err.message : String(err),
    });

    const data = await fn(createFixtureSource(fixtureKey, { delayMs: 0 }));
    return { data, degraded: true, fixtureKey };
  }
}
