import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");

describe("FCI theme tokens", () => {
  it("primary PHẢI là #203ADC — brand primary, không bao giờ thay màu khác", () => {
    expect(css).toMatch(/--primary:\s*#203ADC/i);
  });

  it("giữ đủ thang fci-50 tới fci-900", () => {
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
      expect(css).toMatch(new RegExp(`--fci-${step}:`));
    }
  });

  it("fci-500 khớp primary", () => {
    expect(css).toMatch(/--fci-500:\s*#203ADC/i);
  });

  it("có token success và warning cho bảng điểm và badge tụt hạng", () => {
    expect(css).toMatch(/--success:/);
    expect(css).toMatch(/--warning:/);
  });

  it("ghi đè thang gray bằng giá trị FCI, không dùng gray mặc định của Tailwind", () => {
    expect(css).toMatch(/--gray-400:\s*#98a2b3/i);
    expect(css).toMatch(/--gray-900:\s*#101828/i);
    expect(css).toMatch(/--color-gray-500:\s*var\(--gray-500\)/);
  });

  it("map các token qua @theme inline để Tailwind sinh utility", () => {
    expect(css).toContain("@theme inline");
    expect(css).toMatch(/--color-fci-500:\s*var\(--fci-500\)/);
    expect(css).toMatch(/--color-success:\s*var\(--success\)/);
  });
});
