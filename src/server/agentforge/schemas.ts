import { z } from "zod";

export const BRAND_FALLBACK_COLOR = "#203ADC";

export const healthResponse = z.object({ status: z.string() });

export const sessionResponse = z
  .object({ session_id: z.string() })
  .transform((r) => ({ sessionId: r.session_id }));

export const crawlResponse = z
  .object({
    session_id: z.string(),
    pages: z.array(
      z.object({
        url: z.string(),
        title: z.string().nullish(),
        status: z.string(),
      }),
    ),
    kb_facts: z.array(z.string()),
    // `"llm"` = facts do LLM trích; `"heuristic"` = LLM lỗi/timeout nên backend rơi về
    // fallback, facts chỉ là dòng đầu mỗi chunk.
    //
    // CỐ Ý dùng `z.string()` chứ không `z.enum(["llm","heuristic"])`: đây là tín hiệu
    // CHỈ ĐỂ HIỂN THỊ, không nuôi cột DB nào. Nếu backend thêm giá trị thứ ba, enum sẽ
    // làm cả lượt crawl vỡ tại biên — biến một field mang tính tư vấn thành sự cố toàn
    // phần. Khác hẳn `score`, bị chặn miền vì nó chảy vào cột `numeric(2,1)` và lệch
    // thang gây tràn số thật. Ở đây fail-open là đúng: giá trị lạ thì không cảnh báo gì.
    //
    // `.nullish()` vì backend cũ (trước 2026-08-11) không trả field này.
    facts_source: z.string().nullish(),
    chunks: z.array(z.string()),
    total_chunks: z.number().int(),
  })
  .transform((r) => ({
    sessionId: r.session_id,
    pages: r.pages.map((p) => ({ url: p.url, title: p.title ?? null, status: p.status })),
    kbFacts: r.kb_facts,
    factsSource: r.facts_source ?? null,
    chunks: r.chunks,
    totalChunks: r.total_chunks,
  }));

export const brandResponse = z
  .object({
    name: z.string().nullish(),
    logo: z.string().nullish(),
    logo_letter: z.string().nullish(),
    color: z.string().nullish(),
    industry: z.string().nullish(),
  })
  .transform((r) => ({
    name: r.name ?? null,
    logo: r.logo ?? null,
    logoLetter: r.logo_letter ?? null,
    color: r.color ?? BRAND_FALLBACK_COLOR,
    industry: r.industry ?? null,
  }));

const personaSchema = z
  .object({
    name: z.string(),
    role: z.string(),
    description: z.string(),
    avatar_letter: z.string().nullish(),
  })
  .transform((p) => ({
    name: p.name,
    role: p.role,
    description: p.description,
    avatarLetter: p.avatar_letter ?? p.name.slice(0, 1).toUpperCase(),
  }));

/**
 * Wire shape của `brand` và `persona` trong `POST /api/sessions/restore` —
 * snake_case, theo `endpoint.md` §`/api/sessions/restore`.
 *
 * Hai field này từng là `Record<string, unknown>` trong `RestoreInput`, lỗ hổng
 * không-kiểu duy nhất ở biên này, và chính nó đã để một `persona` camelCase
 * (`avatarLetter`) đi thẳng tới một API snake_case mà TypeScript không kêu gì.
 */
export interface RestoreBrand {
  name: string | null;
  logo: string | null;
  logo_letter: string | null;
  color: string | null;
  industry: string | null;
}

export interface RestorePersona {
  name: string;
  role: string;
  description: string;
  avatar_letter: string | null;
}

/**
 * Đổi NGƯỢC `Persona` (đã transform, camelCase) về wire shape snake_case.
 *
 * Đặt ngay cạnh `personaSchema` có chủ đích: hai hàm là một cặp đối xứng, và
 * để chúng ở hai file khác nhau là cách chắc chắn nhất để lần sau chỉ sửa một nửa.
 *
 * `null` khi agent chưa build (chưa có persona nào để gửi) — `persona` là field
 * optional của endpoint restore.
 */
export function personaToWire(persona: Persona | null): RestorePersona | null {
  if (!persona) return null;
  return {
    name: persona.name,
    role: persona.role,
    description: persona.description,
    avatar_letter: persona.avatarLetter,
  };
}

export const buildResponse = z
  .object({
    brand: brandResponse,
    persona: personaSchema,
    system_prompt: z.string(),
    guardrails: z.array(z.string()),
    industry: z.string().nullish(),
  })
  .transform((r) => ({
    brand: r.brand,
    persona: r.persona,
    systemPrompt: r.system_prompt,
    guardrails: r.guardrails,
    industry: r.industry ?? null,
  }));

const breakdownEntry = z.object({ pass: z.number().int(), total: z.number().int() });

/**
 * Thang điểm của LLM-judge: **0–5**. Đây là một GIẢ ĐỊNH đọc từ spec, chưa bao giờ
 * đối chiếu với một response thật (xem `docs/contract-assumptions.md` #18) — mọi
 * schema trong dự án này viết từ spec, nên thang 0–10 thay vì 0–5 đúng là loại
 * chuyện sai tới khi chứng minh được là đúng.
 *
 * Vì sao phải chặn ở đây chứ không để DB chặn: cột `score` là `numeric(2,1)` (tối đa
 * 9.9) và `avg_score` là `numeric(3,2)` (tối đa 9.99). Một score `10` gây
 * `numeric field overflow` — một `Error` trần, nên `mapErrors` thay bằng message
 * chung — **sau tối đa 300 giây** eval, tức báo một lệch contract thành lỗi hệ thống
 * không rõ nguyên nhân, đúng lúc người dùng vừa chờ 5 phút. Chặn tại biên thì lệch
 * thang nổi lên như một lỗi contract với nguyên nhân đúng, ngay lập tức. Từ chối một
 * số 10 ở đây là thất bại ĐÚNG.
 */
export const SCORE_MAX = 5;

const scoreSchema = z
  .number()
  .min(0, "score phải >= 0")
  .max(SCORE_MAX, `score vượt thang 0-${SCORE_MAX} — backend có thể đã đổi thang điểm`);

export const evalResponse = z
  .object({
    summary: z.object({
      // `pass_rate` là phần trăm và cột là `integer` (tối đa 2.147 tỷ), nên KHÔNG có
      // nguy cơ overflow như `score`/`avg_score`. Vẫn chặn 0–100 vì một phần trăm
      // ngoài khoảng đó là lệch contract, không phải dữ liệu. Lưu ý `saveEvalRun`
      // làm tròn nó, nên 90.5 vào DB thành 91 — mất mát này ghi ở assumption #18.
      pass_rate: z.number().min(0, "pass_rate phải >= 0").max(100, "pass_rate phải <= 100"),
      avg_score: scoreSchema,
      passed: z.number().int(),
      total: z.number().int(),
      breakdown: z.object({
        grounded: breakdownEntry,
        trap: breakdownEntry,
        edge: breakdownEntry,
      }),
    }),
    results: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
        score: scoreSchema,
        pass: z.boolean(),
        reasoning: z.string().nullish(),
        category: z.enum(["grounded", "trap", "edge"]),
      }),
    ),
  })
  .transform((r) => ({
    summary: {
      passRate: r.summary.pass_rate,
      avgScore: r.summary.avg_score,
      passed: r.summary.passed,
      total: r.summary.total,
      breakdown: r.summary.breakdown,
    },
    results: r.results.map((t) => ({
      question: t.question,
      answer: t.answer,
      score: t.score,
      passed: t.pass,
      reasoning: t.reasoning ?? null,
      category: t.category,
    })),
  }));

export const chatResponse = z.object({ reply: z.string() });

export const documentResponse = z
  .object({
    document_id: z.string(),
    file_name: z.string(),
    chunks: z.number().int(),
    pages: z.number().int(),
  })
  .transform((r) => ({
    documentId: r.document_id,
    fileName: r.file_name,
    chunks: r.chunks,
    pages: r.pages,
  }));

export const kbResponse = z
  .object({
    count: z.number().int(),
    chunks: z.array(
      z.object({
        id: z.string(),
        document: z.string(),
        metadata: z
          .object({
            source: z.string().nullish(),
            source_url: z.string().nullish(),
          })
          .default({}),
      }),
    ),
  })
  .transform((r) => ({
    count: r.count,
    chunks: r.chunks.map((c) => ({
      id: c.id,
      content: c.document,
      source: c.metadata.source === "pdf" ? ("pdf" as const) : ("web" as const),
      sourceUrl: c.metadata.source_url ?? null,
    })),
  }));

export const restoreResponse = z
  .object({ session_id: z.string(), chunks_ingested: z.number().int() })
  .transform((r) => ({ sessionId: r.session_id, chunksIngested: r.chunks_ingested }));

export type CrawlResult = z.output<typeof crawlResponse>;
export type BrandResult = z.output<typeof brandResponse>;
export type BuildResult = z.output<typeof buildResponse>;
export type EvalResult = z.output<typeof evalResponse>;
export type KbSnapshot = z.output<typeof kbResponse>;
export type DocumentResult = z.output<typeof documentResponse>;
export type Persona = BuildResult["persona"];
