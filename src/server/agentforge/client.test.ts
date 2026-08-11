import { describe, expect, it, vi } from "vitest";
import { createClient, KB_SNAPSHOT_LIMIT } from "./client";
import { AgentForgeError } from "./errors";
import { RAW_CRAWL, RAW_KB } from "./__fixtures__/responses";

const BASE = "http://127.0.0.1:8444";

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

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
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("session_id")).toBe("sid");
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
      brand: { name: "Sen Spa", logo_letter: "S", color: "#203ADC" },
      persona: { name: "Sen", role: "Tư vấn", description: "d", avatar_letter: "S" },
      url: "https://senspa.vn",
    });

    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string);
    expect(body.session_id).toBe("sid");
    expect(body.system_prompt).toBe("Bạn là Sen");
    expect(body.chunks).toEqual(["c1", "c2"]);
    expect(body.kb_facts).toEqual(["f1"]);
  });
});
