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

/** Levenshtein, chỉ cần biết "có phải ≤ 1 không" nên thoát sớm. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j]! + 1,
        row[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length]!;
}

/** Bỏ hậu tố shade để lấy phần "họ" của một từ ứng viên: `terminal-bg` -> `terminal`. */
function candidateStem(word: string): string {
  const i = word.lastIndexOf("-");
  if (i === -1) return word;
  const tail = word.slice(i + 1);
  return /^\d+$/.test(tail) || SHADE_SUFFIXES.has(tail) ? word.slice(0, i) : word;
}

/** Độ dài tối thiểu để một stem đã khai được coi là "tiền tố có ý nghĩa". Dài 3 thì
 * `gra` của `gray` sẽ ăn cả `bg-gradient-to-br` — 4 là ngưỡng tách được hai ca đó. */
const MIN_STEM_PREFIX = 4;

/**
 * Từ KHÔNG khớp family nào nhưng *gần* một token đã khai — tức gần chắc chắn là typo.
 * Bản cũ bỏ qua hẳn nhóm này, nên `bg-terminal-bg`, `text-fci500` và
 * `border-succes-muted` đều lọt: sai ở chính phần stem thì không stem nào khớp.
 * Trả về tên token bị nghi là gõ sai, hoặc null.
 */
function nearMissToken(word: string, stems: Set<string>, declared: Set<string>): string | null {
  // (a) Thiếu dấu gạch: `fci500` -> `fci-500`. Chữ+số liền nhau mà tách ra thì thành
  //     token thật — chữ ký của typo này rất hẹp nên gần như không có dương tính giả.
  const noDash = /^([a-z]+)(\d+)$/.exec(word);
  if (noDash) {
    const guess = `${noDash[1]}-${noDash[2]}`;
    if (declared.has(guess) || stems.has(noDash[1]!)) return guess;
  }

  for (const candidate of new Set([word, candidateStem(word)])) {
    for (const stem of stems) {
      // (b) Một stem đã khai là tiền tố thật của ứng viên: `term` ⊂ `terminal`.
      if (
        stem.length >= MIN_STEM_PREFIX &&
        candidate !== stem &&
        candidate.startsWith(stem)
      ) {
        return stem;
      }
      // (c) Lệch đúng một ký tự: `succes` vs `success`. Chặn từ ngắn (`sm`, `xs`, `md`)
      //     vì ở độ dài đó khoảng cách 1 không còn nói lên điều gì.
      if (candidate.length >= MIN_STEM_PREFIX && editDistance(candidate, stem) <= 1) {
        return stem;
      }
    }
  }
  return null;
}

const PREFIXES = ["bg", "text", "border", "ring", "from", "to", "via", "fill", "stroke", "outline", "decoration", "shadow", "accent", "caret", "divide", "placeholder"];

/**
 * Bản cũ mô tả variant bằng `(?:[a-z-]+:)*`, không khớp nổi variant ngoặc vuông như
 * `max-[900px]:` — mà nhánh này dùng variant breakpoint tuỳ ý ở 13 file, nên MỌI class
 * màu nằm sau một breakpoint đều chưa từng được quét.
 *
 * Thay vì cố mô tả đủ mọi hình dạng variant (thử rồi: một mẫu lồng `(?:(?:...|...)+:)*`
 * gây backtracking nổ, cả suite treo hơn 40 giây), chỉ cần cho phép class BẮT ĐẦU ngay
 * sau một dấu `:`. Thế là nhận được `md:`, `max-[900px]:`, `[&_svg]:`,
 * `has-[>img:first-child]:`, `data-[size=sm]:`, `*:` và variant xếp chồng — mà mẫu vẫn
 * tuyến tính, vì không còn định lượng lồng nhau.
 *
 * Đánh đổi: phần trước dấu `:` không được kiểm là variant thật. Nghĩa là lưới có thể
 * quét cả thứ nằm sau `:` trong một arbitrary value. Đó là hướng an toàn cho một cái
 * lưới (quét thừa, không phải bỏ sót) và cây hiện tại vẫn xanh.
 */
function classScanner(): RegExp {
  return new RegExp(
    String.raw`(?:^|[\s"'\x60{:])(${PREFIXES.join("|")})-([a-z][a-z0-9-]*)(?:\/\d+)?(?=["'\x60\s}])`,
    "g",
  );
}

/**
 * Các class màu trong `src` trỏ tới token không tồn tại (kèm lý do).
 *
 * ĐIỂM MÙ CÒN LẠI — đã thử thật, không phải suy đoán:
 * - `bg-fic-50` KHÔNG bị tố: stem ứng viên `fic` ngắn hơn `MIN_STEM_PREFIX` nên luật
 *   khoảng cách bỏ qua. Hạ ngưỡng xuống 3 thì `bg-gradient-to-br` bị tố oan.
 * - `bg-tmer-bg` KHÔNG bị tố: đảo chỗ hai ký tự là khoảng cách Levenshtein 2, không
 *   phải 1. Cần Damerau–Levenshtein mới bắt được.
 * - `mdx:text-fci-500` KHÔNG bị tố: lưới chỉ soi phần TOKEN, không bao giờ kiểm phần
 *   variant. Gõ sai tên variant vẫn sinh CSS chết mà lưới này không thấy.
 * - Chỉ quét `.tsx` dưới `src/components` và `src/app`. Class nằm trong file `.ts`,
 *   trong `@apply` của `globals.css`, hay ngoài hai thư mục đó đều không được quét.
 * - Chỉ so với token MÀU. Token chết thuộc nhóm khác (radius, shadow, spacing) không
 *   thuộc phạm vi, dù `shadow` có trong `PREFIXES`.
 * - Class dựng động (`` cn(`bg-${x}-500`) ``) là vô hình — nhưng Tailwind cũng không
 *   thấy, nên loại đó chết sẵn vì lý do khác.
 */
function deadColorClasses(src: string, declared: Set<string>, stems: Set<string>): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(classScanner())) {
    const [, prefix, name] = m;
    if (!PREFIXES.includes(prefix!)) continue;
    if (BUILTIN.has(name!)) continue;
    if (declared.has(name!)) continue;
    // Đúng family token của ta nhưng sai hậu tố: `text-gray-1000`, `bg-term-bgg`.
    if (looksLikeColorToken(name!, stems)) {
      out.push(`${prefix}-${name}`);
      continue;
    }
    // Không khớp family nào — có thể là utility lõi của Tailwind (`text-sm`,
    // `border-dashed`) hoặc typo ngay ở phần stem. Chỉ nhóm sau bị tố.
    const near = nearMissToken(name!, stems, declared);
    if (near) out.push(`${prefix}-${name} (nghi gõ sai "${near}")`);
  }
  return out;
}

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
      for (const bad of deadColorClasses(readFileSync(file, "utf8"), declared, stems)) {
        offenders.push(`${file}: ${bad}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * Chính cái lưới trên bị test lại, vì nó là lưới an toàn mà năm task của kế hoạch
   * này dựa vào — và nó từng chỉ bắt 1 trong 5 class chết thật. Nửa trên là năm ca đã
   * lọt; nửa dưới là các utility lõi của Tailwind phải KHÔNG bị tố. Hai nửa đó là
   * toàn bộ sự đánh đổi của luật này, nên chúng phải nằm ngay trong suite.
   */
  it("lưới bắt được cả năm class chết đã lọt, và không tố utility lõi", () => {
    const declared = declaredColorTokens();
    const stems = familyStems(declared);
    const scan = (cls: string) => deadColorClasses(`className="${cls}"`, declared, stems);

    for (const dead of [
      "text-gray-1000",
      "bg-terminal-bg",
      "text-fci500",
      "border-succes-muted",
      "max-[900px]:bg-term-bgg",
    ]) {
      expect(scan(dead), `phải tố: ${dead}`).not.toEqual([]);
    }

    for (const fine of [
      "text-sm", "border-t", "shadow-xs", "border-dashed", "text-center",
      "bg-clip-text", "bg-gradient-to-br", "text-balance", "text-transparent",
      "bg-linear-135", "text-white", "shadow-none", "ring-inset", "bg-cover",
      "text-nowrap", "border-solid", "divide-y", "outline-none", "shadow-md",
      "bg-fci-50", "max-[900px]:bg-term-bg", "hover:text-fci-700", "[&_svg]:text-gray-400",
    ]) {
      expect(scan(fine), `không được tố: ${fine}`).toEqual([]);
    }
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
