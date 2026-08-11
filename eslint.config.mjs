import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = tseslint.config(
  {
    // `next-env.d.ts` là file Next.js tự sinh và tự ghi đè mỗi lần build —
    // header của chính nó nói "should not be edited". Lint nó chỉ để báo một
    // lỗi ta không được sửa.
    ignores: [".next/**", "node_modules/**", "src/generated/**", "next-env.d.ts"],
  },
  // `next/core-web-vitals` mang theo react, react-hooks, jsx-a11y và
  // `@next/next` — eslint-config-next chỉ xuất bản dạng eslintrc cũ, nên phải
  // qua FlatCompat để dùng được trong flat config.
  ...compat.extends("next/core-web-vitals"),
  // Linting TypeScript qua chính typescript-eslint (không qua "next/typescript"
  // của eslint-config-next) để có type-aware rules đúng bản đang cài, không
  // phụ thuộc phiên bản @typescript-eslint mà eslint-config-next tự khoá.
  ...tseslint.configs.recommended,
  {
    rules: {
      // Codebase quy ước gạch dưới đầu (`_opts`, `_omit`, `_drop`) cho tham số
      // hoặc phần huỷ cấu trúc CÓ CHỦ Ý bỏ qua (ví dụ `const { chunks: _omit,
      // ...rest } = raw` để test "thiếu field X thì vỡ" mà không cần dùng
      // field đó). Rule mặc định không biết quy ước này; khớp theo tên là cách
      // config-level, không phải sửa từng chỗ để né rule.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],

      // Trong codebase này `any` không xuất hiện tuỳ tiện — chỗ nào dùng đều
      // là ranh giới với dữ liệu chưa được kiểm (response HTTP thô, payload
      // lỗi FastAPI) trước khi Zod validate. Giữ cảnh báo ở mức "warn" để vẫn
      // hữu ích trong IDE, không nâng "error" — nâng lên sẽ đòi refactor các
      // ranh giới đó, việc đó nằm ngoài phạm vi của đợt thêm lint gate này.
      "@typescript-eslint/no-explicit-any": "warn",

      // Rule này soát dependency của useEffect/useMemo/useCallback theo kiểu
      // tĩnh — rất dễ báo sai với hàm ổn định qua closure (setState setter,
      // ref) hoặc khi phụ thuộc bị bỏ qua có chủ đích để tránh loop. Ở quy mô
      // nhỏ của app này, số false positive lấn hết giá trị cảnh báo thật; tắt
      // để phần còn lại của lint gate đáng tin, không bị chìm trong noise.
      "react-hooks/exhaustive-deps": "off",
    },
  },
);

export default eslintConfig;
