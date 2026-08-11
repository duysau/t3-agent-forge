import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("src/styles/globals.css", "utf8");

/** Nội dung khối `@theme inline { ... }` — nơi token thật sự có hiệu lực với Tailwind v4. */
function themeInlineBlock(): string {
  const m = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(CSS);
  if (!m) throw new Error("Không tìm thấy khối @theme inline trong globals.css");
  return m[1]!;
}

/** Tên token màu khai trong khối `@theme inline`, ví dụ `--color-fci-300` -> `fci-300`. */
function declaredColorTokens(): Set<string> {
  const out = new Set<string>();
  for (const m of themeInlineBlock().matchAll(/--color-([a-z0-9-]+)\s*:/g)) out.add(m[1]!);
  return out;
}

/** Màu Tailwind dựng sẵn không cần khai token. */
const BUILTIN = new Set(["white", "black", "transparent", "current", "inherit"]);

/**
 * Đuôi "shade/variant" dùng trong tên token của project, ví dụ `term-bg`, `fci-500`,
 * `error-muted`, `card-foreground`. Dùng để bóc "family stem" (`term`, `fci`, `error`, `card`)
 * từ tên token đã khai — không phải danh sách class Tailwind, chỉ là hậu tố xuất hiện
 * thật trong globals.css.
 */
const SHADE_SUFFIXES = new Set([
  "foreground", "muted", "strong", "bg", "bar", "border", "fg", "dim",
  "green", "blue", "yellow", "red",
]);

/**
 * "Family stem" của các token màu riêng của project: phần gốc trước hậu tố shade,
 * ví dụ "fci-500" -> "fci", "term-bg" -> "term", "cat-edge-fg" -> "cat-edge",
 * "error-muted" -> "error", "card-foreground" -> "card". Đây là phạm vi rủi ro thật của
 * test này — một class dùng đúng prefix (bg-/text-/border-/...) và đúng "họ" token của ta
 * nhưng sai hậu tố (typo, đổi tên) sẽ không sinh CSS gì cả. Các utility lõi của Tailwind
 * (`text-sm`, `border-t`, `shadow-xs`, `border-dashed`, ...) không thuộc bất cứ family nào
 * ở đây nên không bị coi là "tham chiếu token màu".
 */
function familyStems(declared: Set<string>): Set<string> {
  const stems = new Set<string>();
  for (const name of declared) {
    stems.add(name);
    const i = name.lastIndexOf("-");
    if (i === -1) continue;
    const tail = name.slice(i + 1);
    if (/^\d+$/.test(tail) || SHADE_SUFFIXES.has(tail)) {
      stems.add(name.slice(0, i));
    }
  }
  return stems;
}

/** `word` có thuộc một family token màu của project không (đứng riêng hoặc theo sau "-"). */
function looksLikeColorToken(word: string, stems: Set<string>): boolean {
  for (const stem of stems) {
    if (word === stem || word.startsWith(`${stem}-`)) return true;
  }
  return false;
}

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
    const stems = familyStems(declared);
    const offenders: string[] = [];

    for (const file of [...sourceFiles("src/components"), ...sourceFiles("src/app")]) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/(?:^|[\s"'`{])(?:[a-z-]+:)*(bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|shadow|accent|caret|divide|placeholder)-([a-z][a-z0-9-]*)(?:\/\d+)?(?=["'`\s}])/g)) {
        const [, prefix, name] = m;
        if (!PREFIXES.includes(prefix!)) continue;
        if (BUILTIN.has(name!)) continue;
        if (declared.has(name!)) continue;
        // Không thuộc family token màu nào của ta (ví dụ text-sm, border-t, shadow-xs,
        // border-dashed) — đó là utility lõi của Tailwind, không phải tham chiếu token.
        if (!looksLikeColorToken(name!, stems)) continue;
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

  it("khai đủ shadow scale và radius-2xl bên trong @theme inline", () => {
    const theme = themeInlineBlock();
    for (const t of ["--shadow-xs", "--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-xl"]) {
      expect(theme).toContain(t);
    }
    expect(theme).toContain("--radius-2xl");
  });
});
