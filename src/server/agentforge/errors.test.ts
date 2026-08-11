import { describe, expect, it } from "vitest";
import {
  AgentForgeError,
  extractDetail,
  isFallbackWorthy,
  isSessionMissing,
  kindFromStatus,
} from "./errors";

describe("kindFromStatus", () => {
  it.each([
    [400, "bad_request"],
    [404, "session_missing"],
    [422, "bad_request"],
    [500, "internal"],
    [502, "upstream"],
    [503, "upstream"],
    [418, "internal"],
  ])("status %i → %s", (status, kind) => {
    expect(kindFromStatus(status)).toBe(kind);
  });
});

describe("extractDetail", () => {
  it("lấy detail dạng chuỗi của FastAPI", () => {
    expect(extractDetail({ detail: "PDF không có text" }, 400)).toBe("PDF không có text");
  });

  it("làm phẳng detail dạng array của lỗi validation 422", () => {
    const body = {
      detail: [
        { loc: ["body", "url"], msg: "field required", type: "value_error.missing" },
        { loc: ["body", "max_pages"], msg: "must be <= 20", type: "value_error" },
      ],
    };
    const out = extractDetail(body, 422);
    expect(out).toContain("body.url: field required");
    expect(out).toContain("body.max_pages: must be <= 20");
    expect(out).not.toContain("[object Object]");
  });

  it("body không có detail thì rơi về mã HTTP", () => {
    expect(extractDetail({ something: "else" }, 500)).toBe("HTTP 500");
  });

  it("body là chuỗi thô (không parse được JSON) thì dùng luôn chuỗi đó", () => {
    expect(extractDetail("Internal Server Error", 500)).toBe("Internal Server Error");
  });
});

describe("isSessionMissing", () => {
  it("đúng với lỗi 404 từ backend", () => {
    expect(isSessionMissing(new AgentForgeError("session_missing", "không thấy session", 404))).toBe(true);
  });

  it("sai với lỗi 502", () => {
    expect(isSessionMissing(new AgentForgeError("upstream", "LLM lỗi", 502))).toBe(false);
  });

  it("sai với Error thường — không được kích hoạt restore vì lỗi lạ", () => {
    expect(isSessionMissing(new Error("boom"))).toBe(false);
  });
});

describe("isFallbackWorthy", () => {
  it.each(["upstream", "network", "timeout"] as const)("%s đáng tụt hạng", (kind) => {
    expect(isFallbackWorthy(new AgentForgeError(kind, "x", null))).toBe(true);
  });

  it.each(["bad_request", "contract", "session_missing", "internal"] as const)(
    "%s KHÔNG đáng tụt hạng",
    (kind) => {
      expect(isFallbackWorthy(new AgentForgeError(kind, "x", null))).toBe(false);
    },
  );
});

describe("AgentForgeError", () => {
  it("giữ detail và status để UI hiện đúng nguyên nhân", () => {
    const err = new AgentForgeError("bad_request", "PDF không có text", 400);
    expect(err.detail).toBe("PDF không có text");
    expect(err.status).toBe(400);
    expect(err.message).toContain("PDF không có text");
  });

  it("giữ raw response cho lỗi contract", () => {
    const err = new AgentForgeError("contract", "thiếu chunks", null, { chunks: undefined });
    expect(err.raw).toEqual({ chunks: undefined });
  });
});
