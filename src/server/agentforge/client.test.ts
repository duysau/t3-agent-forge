import { describe, expect, it, vi } from "vitest";
import { createClient, KB_SNAPSHOT_LIMIT, TIMEOUTS } from "./client";
import { AgentForgeError } from "./errors";
import { RAW_BRAND, RAW_BUILD, RAW_CRAWL, RAW_EVAL, RAW_KB } from "./__fixtures__/responses";

const BASE = "http://127.0.0.1:8444";

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createClient.createSession", () => {
  it("POST không kèm body, trả về sessionId dạng camelCase", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes({ session_id: "s1" }));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const result = await client.createSession();

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/sessions`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(result).toEqual({ sessionId: "s1" });
  });
});

describe("createClient.crawl", () => {
  it("POST đúng path và body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(RAW_CRAWL));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const result = await client.crawl({ url: "https://senspa.vn", maxPages: 5 });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/crawl`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ url: "https://senspa.vn", max_pages: 5 });
    expect(result.sessionId).toBe("a73534289394");
  });

  it("chuyển 502 kèm detail thành AgentForgeError kind upstream", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonRes({ detail: "Không crawl được: Cloudflare" }, 502));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    await expect(client.crawl({ url: "https://x.vn", maxPages: 5 })).rejects.toMatchObject({
      kind: "upstream",
      detail: "Không crawl được: Cloudflare",
      status: 502,
    });
  });

  it("chuyển response sai contract thành kind contract, giữ raw", async () => {
    const { chunks: _drop, ...broken } = RAW_CRAWL;
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(broken));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const err = await client.crawl({ url: "https://x.vn", maxPages: 5 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AgentForgeError);
    expect((err as AgentForgeError).kind).toBe("contract");
    expect((err as AgentForgeError).raw).toMatchObject({ session_id: "a73534289394" });
  });

  it("chuyển fetch throw thành kind network", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    await expect(client.crawl({ url: "https://x.vn", maxPages: 5 })).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("chuyển abort thành kind timeout", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );
    const client = createClient({ baseUrl: BASE, fetchImpl });

    await expect(client.crawl({ url: "https://x.vn", maxPages: 5 })).rejects.toMatchObject({
      kind: "timeout",
    });
  });
});

describe("createClient.brand", () => {
  it("GET có encode session id chứa ký tự đặc biệt trong path", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(RAW_BRAND));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const result = await client.brand("a b/c");

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/brand/a%20b%2Fc`);
    expect(init.method).toBe("GET");
    expect(result).toEqual({
      name: "Sen Spa",
      logo: "🌸",
      logoLetter: "S",
      color: "#203ADC",
      industry: "spa",
    });
  });
});

describe("createClient.build", () => {
  it("POST đúng path và body, trả về persona.avatarLetter và systemPrompt dạng camelCase", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(RAW_BUILD));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const result = await client.build({ sessionId: "sid", product: "chat" });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/build`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ session_id: "sid", product: "chat" });
    expect(result.persona.avatarLetter).toBe("S");
    expect(result.systemPrompt).toBe(RAW_BUILD.system_prompt);
  });
});

describe("createClient.evaluate", () => {
  it("POST đúng path và body, trả về summary.passRate và results[].passed dạng camelCase", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(RAW_EVAL));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const result = await client.evaluate({ sessionId: "sid", product: "voice" });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/eval`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ session_id: "sid", product: "voice" });
    expect(result.summary.passRate).toBe(RAW_EVAL.summary.pass_rate);
    expect(result.results[0]?.passed).toBe(true);
  });

  /**
   * Thang 0–10 (thay vì 0–5 mà spec ghi) phải nổ ở ĐÂY, tại biên, với kind
   * `contract` — không phải sau đó ở `saveEvalRun` dưới dạng
   * `numeric field overflow` (cột `score` là `numeric(2,1)`), một `Error` trần bị
   * thay bằng message chung sau tối đa 300 giây chờ eval.
   */
  it("score 10 là lỗi contract tại biên, không phải numeric overflow ở DB", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonRes({
        ...RAW_EVAL,
        results: [{ ...RAW_EVAL.results[0], score: 10 }],
      }),
    );
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const err: unknown = await client
      .evaluate({ sessionId: "sid", product: "chat" })
      .then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(AgentForgeError);
    expect((err as AgentForgeError).kind).toBe("contract");
    expect((err as AgentForgeError).detail).toContain("results.0.score");
  });
});

describe("createClient.kbSnapshot", () => {
  it("GET kèm session_id và limit tối đa", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(RAW_KB));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const snap = await client.kbSnapshot("a73534289394");

    const [url] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/kb?session_id=a73534289394&limit=${KB_SNAPSHOT_LIMIT}`);
    expect(snap.chunks).toHaveLength(2);
    expect(snap.chunks[1]?.source).toBe("pdf");
  });
});

describe("createClient.chat", () => {
  it("gửi history lên backend thay vì dựa vào state server", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes({ reply: "Dạ 350.000đ ạ." }));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    await client.chat({
      sessionId: "sid",
      message: "Giá bao nhiêu?",
      history: [{ role: "user", content: "Xin chào" }],
    });

    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string);
    expect(body).toEqual({
      session_id: "sid",
      message: "Giá bao nhiêu?",
      history: [{ role: "user", content: "Xin chào" }],
    });
  });

  it("404 thành kind session_missing để tầng trên hồi sinh session", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes({ detail: "Session không tồn tại" }, 404));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    await expect(
      client.chat({ sessionId: "die", message: "hi", history: [] }),
    ).rejects.toMatchObject({ kind: "session_missing" });
  });
});

describe("createClient.uploadDocument", () => {
  it("gửi multipart với session_id và file", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonRes({ document_id: "d1", file_name: "a.pdf", chunks: 4, pages: 1 }));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const file = new File([new Uint8Array([1, 2, 3])], "a.pdf", { type: "application/pdf" });
    const result = await client.uploadDocument({ sessionId: "sid", file });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/documents`);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("session_id")).toBe("sid");
    expect((init.body as FormData).get("file")).toBe(file);
    expect(result.chunks).toBe(4);
  });
});

describe("createClient.restore", () => {
  it("gửi đủ artifacts và chunks đã lưu", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonRes({ session_id: "sid", chunks_ingested: 2 }));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    await client.restore({
      sessionId: "sid",
      systemPrompt: "Bạn là Sen",
      guardrails: ["g1"],
      chunks: ["c1", "c2"],
      kbFacts: ["f1"],
      brand: {
        name: "Sen Spa",
        logo: "🌸",
        logo_letter: "S",
        color: "#203ADC",
        industry: "spa",
      },
      persona: { name: "Sen", role: "Tư vấn", description: "d", avatar_letter: "S" },
      url: "https://senspa.vn",
    });

    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string);
    expect(body).toEqual({
      session_id: "sid",
      system_prompt: "Bạn là Sen",
      guardrails: ["g1"],
      chunks: ["c1", "c2"],
      kb_facts: ["f1"],
      brand: {
        name: "Sen Spa",
        logo: "🌸",
        logo_letter: "S",
        color: "#203ADC",
        industry: "spa",
      },
      persona: { name: "Sen", role: "Tư vấn", description: "d", avatar_letter: "S" },
      url: "https://senspa.vn",
    });
  });

  /**
   * Agent chưa build thì `personaToWire` trả `null` — và backend TỪ CHỐI
   * `"persona": null` với 422 `{"type":"dict_type","loc":["body","persona"]}`
   * (`frontend-handoff-1.md` §2.2). `persona` là field OPTIONAL, nên cách đúng
   * là bỏ hẳn key, không phải gửi null.
   *
   * Đây là đường hồi sinh session cho link demo đã chia sẻ: gửi null nghĩa là
   * mọi lượt restore trước khi build đầu tiên xong đều 422 — chat trên link đã
   * chia sẻ chết, đúng lúc không ai đang nhìn màn hình để hiểu vì sao.
   */
  it("bỏ hẳn key persona khi agent chưa build, KHÔNG gửi persona null", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonRes({ session_id: "sid", chunks_ingested: 0 }));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    await client.restore({
      sessionId: "sid",
      systemPrompt: "",
      guardrails: [],
      chunks: [],
      kbFacts: [],
      brand: { name: null, logo: null, logo_letter: null, color: null, industry: null },
      persona: null,
      url: "https://senspa.vn",
    });

    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty("persona");
    expect(body.session_id).toBe("sid");
  });
});

describe("createClient.publishVoice", () => {
  it("POST /api/voice/publish với session_id, kèm site_name khi có", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonRes({
        session_id: "sid",
        site_name: "senspa.vn",
        facts: 70,
        knowledge_id: "kb_1",
        agent_id: "ag_1",
        message: "Đã đẩy KB lên agent voice",
      }),
    );
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const result = await client.publishVoice({ sessionId: "sid", siteName: "senspa.vn" });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/voice/publish`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      session_id: "sid",
      site_name: "senspa.vn",
    });
    expect(result.facts).toBe(70);
    expect(result.knowledgeId).toBe("kb_1");
  });

  it("không gửi key site_name khi không truyền", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes({ facts: 1 }));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    await client.publishVoice({ sessionId: "sid" });

    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty("site_name");
  });

  /**
   * `/api/build` trả kết quả publish BỌC trong `voice_publish`; endpoint riêng
   * `/api/voice/publish` chưa bao giờ được gọi thật (backend Python không chạy
   * lúc viết đoạn này), nên không biết nó trả phẳng hay bọc. Chấp nhận CẢ HAI
   * hình dạng: đoán sai một lần ở đây là cả nút publish chết trên sân khấu,
   * trong khi bốn dòng tháo bọc thì không mất gì.
   */
  it("tháo được cả response bọc trong voice_publish", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonRes({ voice_publish: { facts: 61, agent_id: "ag_1" } }));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const result = await client.publishVoice({ sessionId: "sid" });

    expect(result.facts).toBe(61);
    expect(result.agentId).toBe("ag_1");
  });

  /**
   * Cùng học thuyết với `facts_source` (`docs/contract-assumptions.md` #19):
   * đây là tín hiệu CHỈ ĐỂ HIỂN THỊ, không nuôi cột DB nào — nên mọi field đều
   * nullish và một response thiếu field không được phép làm publish thất bại.
   */
  it("response thiếu field vẫn parse được, các field trống thành null", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes({ message: "ok" }));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    const result = await client.publishVoice({ sessionId: "sid" });

    expect(result.message).toBe("ok");
    expect(result.facts).toBeNull();
    expect(result.agentId).toBeNull();
  });
});

/**
 * Bảng timeout là một quyết định của dự án, không phải con số suy ra từ code — nên
 * nó được chốt ở đây. Mỗi lần đổi phải đổi cả test, tức phải là một quyết định có ý
 * thức chứ không phải một lần sửa nhanh rồi quên.
 *
 * Lưu ý một mâu thuẫn còn lại, đã báo và được giữ nguyên: `CRAWL_MAX_PAGES` là 20,
 * mà 20 trang mất ~4 phút theo `frontend-handoff-1.md` §2.1 — dài hơn trần 180 giây
 * ở đây. Với site nhiều trang, client sẽ abort trong khi backend vẫn crawl tới cùng.
 */
describe("TIMEOUTS", () => {
  it("khớp bảng đã chốt cho từng endpoint", () => {
    expect(TIMEOUTS.crawl).toBe(180_000);
    expect(TIMEOUTS.build).toBe(300_000);
    expect(TIMEOUTS.eval).toBe(300_000);
    expect(TIMEOUTS.documents).toBe(25_000);
    expect(TIMEOUTS.chat).toBe(30_000);
    expect(TIMEOUTS.sessions).toBe(8_000);
  });

  it("crawl thực sự gửi AbortSignal đúng trần đó, không phải mặc định của fetch", async () => {
    // Không có dòng này thì bảng trên chỉ là một object hằng số không ai đọc.
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchImpl = vi.fn().mockResolvedValue(jsonRes(RAW_CRAWL));
    const client = createClient({ baseUrl: BASE, fetchImpl });

    await client.crawl({ url: "https://senspa.vn", maxPages: 5 });

    expect(timeout).toHaveBeenCalledWith(TIMEOUTS.crawl);
  });
});
