import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  brandResponse,
  buildResponse,
  chatResponse,
  crawlResponse,
  documentResponse,
  evalResponse,
  healthResponse,
  kbResponse,
  restoreResponse,
  sessionResponse,
} from "./schemas";
import type { ZodType } from "zod";

const DIR = join(process.cwd(), "src/server/agentforge/__fixtures__/recorded");

const SCHEMAS: Record<string, ZodType<unknown>> = {
  "health.json": healthResponse,
  "sessions.json": sessionResponse,
  "crawl.json": crawlResponse,
  "brand.json": brandResponse,
  "documents.json": documentResponse,
  "kb.json": kbResponse,
  "build.json": buildResponse,
  "eval.json": evalResponse,
  "chat.json": chatResponse,
  "restore.json": restoreResponse,
};

const hasRecordings = existsSync(DIR) && readdirSync(DIR).some((f) => f.endsWith(".json"));

if (!hasRecordings) {
  // Cảnh báo ở top-level: Vitest in ra khi nạp file, không cần một test giả để phát nó.
  console.warn(
    "[contract] Chưa có response thật nào được ghi. schemas.ts hiện dựa hoàn toàn vào " +
      "endpoint.md. Chạy `bun run record:responses` ngay khi backend chạm được.",
  );
}

/**
 * Ngủ tới khi có bản ghi thật. Không phải test bị bỏ quên — nó là cái bẫy đặt
 * sẵn: giây phút ai đó chạy `bun run record:responses`, mọi giả định trong
 * schemas.ts bị đem ra đối chiếu với thực tế.
 */
describe.skipIf(!hasRecordings)("contract đối chiếu response thật đã ghi", () => {
  const files = hasRecordings ? readdirSync(DIR).filter((f) => f.endsWith(".json")) : [];

  it("mỗi file đã ghi phải có schema tương ứng", () => {
    for (const file of files) {
      expect(SCHEMAS[file], `Thiếu schema cho ${file}`).toBeDefined();
    }
  });

  it.each(files)("%s parse được bằng schema đang dùng cho live", (file) => {
    const schema = SCHEMAS[file];
    if (!schema) return;
    const raw: unknown = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new Error(
        `${file} không khớp schema — backend đã đổi hoặc endpoint.md sai:\n` +
          JSON.stringify(result.error.issues, null, 2),
      );
    }
  });
});
