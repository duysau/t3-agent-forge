import { bepnha } from "./bepnha";
import { senspa } from "./senspa";
import type { Fixture, FixtureKey } from "./types";

export type { Fixture, FixtureKey } from "./types";

export const FIXTURES: Record<FixtureKey, Fixture> = { senspa, bepnha };

export const DEFAULT_FIXTURE_KEY: FixtureKey = "senspa";

/**
 * Thu hẹp một giá trị đọc từ DB (cột `fixture_key` là `varchar`, kiểu
 * `string | null`) về `FixtureKey`. Kiểm bằng chính `FIXTURES` để một key
 * lạ trong DB không tạo ra fixture không tồn tại.
 */
export function isFixtureKey(value: unknown): value is FixtureKey {
  return typeof value === "string" && Object.hasOwn(FIXTURES, value);
}

/**
 * Khớp domain sang fixture. Dùng khi tụt hạng: nếu URL người dùng nhập trùng
 * một kịch bản mẫu thì dùng chính nó, ngược lại dùng mặc định.
 */
export function fixtureKeyForUrl(url: string): FixtureKey {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return DEFAULT_FIXTURE_KEY;
  }
  const hit = (Object.values(FIXTURES) as Fixture[]).find((f) => f.domain === host);
  return hit?.key ?? DEFAULT_FIXTURE_KEY;
}
