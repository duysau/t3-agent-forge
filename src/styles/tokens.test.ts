import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("src/styles/globals.css", "utf8");

/** Tên token màu khai trong khối `@theme inline`, ví dụ `--color-fci-300` -> `fci-300`. */
function declaredColorTokens(): Set<string> {
  const out = new Set<string>();
  for (const m of CSS.matchAll(/--color-([a-z0-9-]+)\s*:/g)) out.add(m[1]!);
  return out;
}

/** Màu Tailwind dựng sẵn không cần khai token. */
const BUILTIN = new Set([
  "white", "black", "transparent", "current", "inherit",
]);

const PREFIXES = ["bg", "text", "border", "ring", "from", "to", "via", "fill", "stroke", "outline", "decoration", "shadow", "accent", "caret", "divide", "placeholder"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [p] : [];
  });
}

describe("token trong class Tailwind", () => {
  it("mọi class màu đều trỏ tới token có thật — class sai tên không sinh CSS và test thường không thấy", () => {
    const declared = declaredColorTokens();
    const offenders: string[] = [];

    for (const file of [...sourceFiles("src/components"), ...sourceFiles("src/app")]) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/(?:^|[\s"'`{])(?:[a-z-]+:)*(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow|accent|caret|divide|placeholder)-([a-z][a-z0-9-]*)(?:\/\d+)?(?=["'`\s}])/g)) {
        const [, prefix, name] = m;
        if (!PREFIXES.includes(prefix!)) continue;
        if (BUILTIN.has(name!)) continue;
        if (declared.has(name!)) continue;
        offenders.push(`${file}: ${prefix}-${name}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("khai đủ các token mà pass pixel cần", () => {
    for (const t of [
      "gray-25", "term-bg", "term-bar", "term-border", "term-fg", "term-dim",
      "term-green", "term-blue", "term-yellow", "term-red", "cat-edge-bg", "cat-edge-fg",
    ]) {
      expect(declaredColorTokens()).toContain(t);
    }
  });

  it("khai đủ shadow scale và radius-2xl", () => {
    for (const t of ["--shadow-xs", "--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-xl"]) {
      expect(CSS).toContain(t);
    }
    expect(CSS).toContain("--radius-2xl");
  });
});
