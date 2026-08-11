import { afterEach, describe, expect, it, vi } from "vitest";
import { logBoundary } from "./log";

describe("logBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("event kết thúc bằng :error thì log qua console.error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logBoundary("crawl:error", { kind: "network" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("event kết thúc bằng :contract thì log qua console.error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logBoundary("crawl:contract", { raw: { foo: "bar" } });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("event bình thường như foo:ok thì log qua console.info", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logBoundary("foo:ok", { ms: 12 });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("dòng log là JSON hợp lệ, mang đúng event và các key của data", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    logBoundary("foo:ok", { ms: 12, url: "http://x" });

    const line = infoSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.event).toBe("foo:ok");
    expect(parsed.ms).toBe(12);
    expect(parsed.url).toBe("http://x");
  });
});
