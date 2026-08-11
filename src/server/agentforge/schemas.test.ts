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
