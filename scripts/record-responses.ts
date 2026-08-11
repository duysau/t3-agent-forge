/**
 * Ghi lại response THÔ từ backend Python để làm golden fixture.
 * Chạy: bun run record:responses -- https://senspa.vn
 *
 * Không parse, không validate, không sửa gì — mục đích là chụp đúng thực tế,
 * kể cả khi thực tế khác endpoint.md. Chính chỗ khác nhau đó là thứ ta cần.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PYTHON_API_URL ?? "http://127.0.0.1:8444";
const URL_TO_CRAWL = process.argv[2] ?? "https://senspa.vn";
const OUT = join(process.cwd(), "src/server/agentforge/__fixtures__/recorded");

function save(name: string, body: unknown): void {
  writeFileSync(join(OUT, name), JSON.stringify(body, null, 2), "utf8");
  console.log(`  ✓ ${name}`);
}

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`);
  console.log(`GET  ${path} → ${res.status}`);
  return res.json();
}

async function post(path: string, json?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: json ? { "content-type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : undefined,
  });
  console.log(`POST ${path} → ${res.status}`);
  return res.json();
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  console.log(`Ghi response từ ${BASE}\n`);

  save("health.json", await get("/api/health"));
  save("sessions.json", await post("/api/sessions"));

  console.log("\nCrawl (có thể mất tới 3 phút)…");
  const crawl = (await post("/api/crawl", { url: URL_TO_CRAWL, max_pages: 5 })) as {
    session_id?: string;
  };
  save("crawl.json", crawl);

  const sid = crawl.session_id;
  if (!sid) {
    console.error("Không có session_id trong response crawl — dừng lại.");
    process.exit(1);
  }
  console.log(`\nsession_id = ${sid}\n`);

  save("brand.json", await get(`/api/brand/${sid}`));
  save("kb.json", await get(`/api/kb?session_id=${sid}&limit=1000`));
  save("build.json", await post("/api/build", { session_id: sid, product: "chat" }));
  save("chat.json", await post("/api/chat", { session_id: sid, message: "Giá bao nhiêu?", history: [] }));

  console.log("\nEval (20 test case, có thể mất tới 3 phút)…");
  save("eval.json", await post("/api/eval", { session_id: sid, product: "chat" }));

  save(
    "restore.json",
    await post("/api/sessions/restore", {
      session_id: `${sid}-copy`,
      system_prompt: "prompt thử",
      chunks: ["chunk thử"],
    }),
  );

  console.log(
    "\nXong. Chưa ghi documents.json — cần một file PDF thật:\n" +
      `  curl -s -X POST ${BASE}/api/documents -F "session_id=${sid}" -F "file=@<duong-dan>.pdf" ` +
      `> src/server/agentforge/__fixtures__/recorded/documents.json\n\n` +
      "Rồi chạy: bun run test -- recorded-contract",
  );
}

void main();
