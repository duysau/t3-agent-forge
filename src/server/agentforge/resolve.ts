import { createClient } from "./client";
import { isFallbackWorthy } from "./errors";
import { createFixtureSource } from "./fixture-source";
import { logBoundary } from "./log";
import { createLiveSource, type AgentForgeSource } from "./source";
import { DEFAULT_FIXTURE_KEY, fixtureKeyForUrl, type FixtureKey } from "~/lib/fixtures";

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
