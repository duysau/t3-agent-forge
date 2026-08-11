import { describe, expect, it } from "vitest";
import {
  brandResponse,
  buildResponse,
  crawlResponse,
  documentResponse,
  evalResponse,
  kbResponse,
  restoreResponse,
} from "./schemas";
import {
  RAW_BRAND,
  RAW_BUILD,
  RAW_CRAWL,
  RAW_DOCUMENT,
  RAW_EVAL,
  RAW_KB,
  RAW_RESTORE,
} from "./__fixtures__/responses";

describe("crawlResponse", () => {
  it("chuyển snake_case sang camelCase", () => {
    const r = crawlResponse.parse(RAW_CRAWL);
    expect(r.sessionId).toBe("a73534289394");
    expect(r.kbFacts).toEqual(["Dịch vụ massage body 60 phút: 350.000đ"]);
    expect(r.totalChunks).toBe(12);
  });

  it("giữ facts_source lại — Zod mặc định loại field lạ, nên phải khai mới thấy", () => {
    const r = crawlResponse.parse({ ...RAW_CRAWL, facts_source: "heuristic" });
    expect(r.factsSource).toBe("heuristic");
  });

  it("backend cũ không trả facts_source thì thành null, không vỡ", () => {
    const withoutFactsSource = { ...RAW_CRAWL };
    delete (withoutFactsSource as { facts_source?: unknown }).facts_source;
    const r = crawlResponse.parse(withoutFactsSource);
    expect(r.factsSource).toBeNull();
  });

  it("facts_source giá trị lạ vẫn parse được — fail-open cho một field chỉ để hiển thị", () => {
    // CỐ Ý không dùng z.enum: nếu backend thêm loại thứ ba, enum sẽ làm cả lượt crawl
    // vỡ tại biên. Đổi lấy: giá trị lạ đi qua và UI đơn giản không cảnh báo gì.
    const r = crawlResponse.parse({ ...RAW_CRAWL, facts_source: "cached" });
    expect(r.factsSource).toBe("cached");
  });

  it("bỏ qua field lạ backend thêm vào", () => {
    const r = crawlResponse.parse({ ...RAW_CRAWL, field_moi_toanh: 123 });
    expect(r).not.toHaveProperty("field_moi_toanh");
  });

  it("vỡ khi thiếu chunks — đây là field ta phụ thuộc để sở hữu KB", () => {
    const { chunks: _omit, ...withoutChunks } = RAW_CRAWL;
    expect(crawlResponse.safeParse(withoutChunks).success).toBe(false);
  });
});

describe("brandResponse", () => {
  it("parse brand đầy đủ", () => {
    const r = brandResponse.parse(RAW_BRAND);
    expect(r.logoLetter).toBe("S");
    expect(r.color).toBe("#203ADC");
  });

  it("áp màu brand mặc định khi backend không trích được", () => {
    const r = brandResponse.parse({ name: "X", logo_letter: "X" });
    expect(r.color).toBe("#203ADC");
  });
});

describe("buildResponse", () => {
  it("camelCase persona.avatar_letter và system_prompt", () => {
    const r = buildResponse.parse(RAW_BUILD);
    expect(r.persona.avatarLetter).toBe("S");
    expect(r.systemPrompt).toContain("Sen Spa");
    expect(r.guardrails).toHaveLength(2);
  });

  it("avatar_letter không có thì lấy chữ cái đầu tiên của name, in hoa", () => {
    const payload = {
      ...RAW_BUILD,
      persona: {
        name: "sen",
        role: "tư vấn viên",
        description: "mô tả",
        // avatar_letter bị bỏ đi
      },
    };
    const r = buildResponse.parse(payload);
    expect(r.persona.avatarLetter).toBe("S");
  });

  it("avatar_letter là null thì vẫn lấy chữ cái đầu tiên của name, in hoa", () => {
    const payload = {
      ...RAW_BUILD,
      persona: {
        name: "sen",
        role: "tư vấn viên",
        description: "mô tả",
        avatar_letter: null,
      },
    };
    const r = buildResponse.parse(payload);
    expect(r.persona.avatarLetter).toBe("S");
  });
});

describe("evalResponse", () => {
  it("đổi `pass` thành `passed` và giữ breakdown ba nhóm", () => {
    const r = evalResponse.parse(RAW_EVAL);
    expect(r.summary.passRate).toBe(85);
    expect(r.summary.breakdown.trap).toEqual({ pass: 5, total: 6 });
    expect(r.results[0]?.passed).toBe(true);
    expect(r.results[0]?.category).toBe("grounded");
  });

  it("từ chối category lạ", () => {
    const bad = {
      ...RAW_EVAL,
      results: [{ ...RAW_EVAL.results[0], category: "khac" }],
    };
    expect(evalResponse.safeParse(bad).success).toBe(false);
  });

  /**
   * Thang điểm 0–5 là giả định, và nó phải vỡ TẠI BIÊN. Cột `score` là
   * `numeric(2,1)` (tối đa 9.9) và `avg_score` là `numeric(3,2)` (tối đa 9.99), nên
   * một điểm 10 gây `numeric field overflow` — đã kiểm trên PGlite — một `Error` trần
   * bị thay bằng message chung, **sau tối đa 300 giây** eval. Từ chối số 10 ngay ở
   * đây là thất bại đúng: nó nói ra lệch contract, đúng nguyên nhân, ngay lập tức.
   */
  it("từ chối score vượt thang 0-5 — thang 0-10 phải nổ tại biên, không phải overflow ở DB", () => {
    const bad = {
      ...RAW_EVAL,
      results: [{ ...RAW_EVAL.results[0], score: 10 }],
    };
    const parsed = evalResponse.safeParse(bad);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((i) => i.path.join("."))).toContain("results.0.score");
  });

  it("từ chối avg_score vượt thang — cột numeric(3,2) cũng overflow ở 10", () => {
    const bad = { ...RAW_EVAL, summary: { ...RAW_EVAL.summary, avg_score: 10 } };
    expect(evalResponse.safeParse(bad).success).toBe(false);
  });

  it("từ chối score âm", () => {
    const bad = { ...RAW_EVAL, results: [{ ...RAW_EVAL.results[0], score: -1 }] };
    expect(evalResponse.safeParse(bad).success).toBe(false);
  });

  it("nhận điểm biên 0 và 5", () => {
    const ok = {
      ...RAW_EVAL,
      summary: { ...RAW_EVAL.summary, avg_score: 5 },
      results: [
        { ...RAW_EVAL.results[0], score: 0 },
        { ...RAW_EVAL.results[0], score: 5 },
      ],
    };
    expect(evalResponse.safeParse(ok).success).toBe(true);
  });

  // `pass_rate` là phần trăm, cột `integer` — không overflow được, nhưng ngoài 0–100
  // thì không còn là phần trăm.
  it("từ chối pass_rate ngoài 0-100", () => {
    expect(
      evalResponse.safeParse({ ...RAW_EVAL, summary: { ...RAW_EVAL.summary, pass_rate: 101 } })
        .success,
    ).toBe(false);
  });
});

describe("kbResponse", () => {
  it("phẳng hoá document/metadata thành content/source/sourceUrl", () => {
    const r = kbResponse.parse(RAW_KB);
    expect(r.count).toBe(2);
    expect(r.chunks[0]).toEqual({
      id: "0f0c87a228331a85ef225b45",
      content: "text của chunk web",
      source: "web",
      sourceUrl: "https://senspa.vn",
    });
    expect(r.chunks[1]?.source).toBe("pdf");
    expect(r.chunks[1]?.sourceUrl).toBeNull();
  });

  it("coi source lạ là web", () => {
    const r = kbResponse.parse({
      count: 1,
      chunks: [{ id: "x", document: "t", metadata: { source: "gi-day" } }],
    });
    expect(r.chunks[0]?.source).toBe("web");
  });
});

describe("documentResponse và restoreResponse", () => {
  it("parse document", () => {
    const r = documentResponse.parse(RAW_DOCUMENT);
    expect(r.fileName).toBe("bang-gia.pdf");
    expect(r.chunks).toBe(4);
  });

  it("parse restore", () => {
    const r = restoreResponse.parse(RAW_RESTORE);
    expect(r.chunksIngested).toBe(42);
  });
});
