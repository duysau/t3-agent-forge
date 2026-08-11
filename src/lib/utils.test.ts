import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("gộp class thường", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("class sau thắng khi xung đột — app dựa vào điều này để override", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("bỏ giá trị falsy", () => {
    expect(cn("px-2", false, null, undefined, "py-1")).toBe("px-2 py-1");
  });

  it("nhận object điều kiện", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});
