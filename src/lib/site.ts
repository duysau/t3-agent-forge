/**
 * Địa chỉ công khai của site — nền cho `metadataBase`, `sitemap.ts` và `robots.ts`.
 *
 * KHÔNG đưa vào `env-schema.js`: schema ở đó validate nghiêm (thiếu biến là
 * throw), nên thêm một biến bắt buộc chỉ để phục vụ metadata sẽ làm chết cả
 * `next build` và `bun dev` của mọi người đang chạy máy local — trong khi hậu
 * quả thật của việc thiếu nó chỉ là OG card trỏ sai host.
 *
 * Thứ tự ưu tiên, dừng ở giá trị đầu tiên có thật:
 *  1. `NEXT_PUBLIC_SITE_URL` — domain thật, đặt tay khi deploy production.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel tự cấp, đúng domain production
 *     kể cả khi đang build một preview deployment.
 *  3. `VERCEL_URL` — URL riêng của deployment hiện tại (preview).
 *  4. localhost — dev.
 *
 * Hai biến Vercel không kèm scheme nên phải tự thêm `https://`.
 */
/**
 * Domain production hiện tại. Là giá trị cuối cùng chứ không phải localhost:
 * nếu một lần build production nào đó thiếu cả `NEXT_PUBLIC_SITE_URL` lẫn biến
 * của Vercel, hỏng theo hướng "OG card trỏ đúng domain thật" vẫn tốt hơn hướng
 * "OG card trỏ vào localhost của máy build".
 *
 * Dev vẫn ra localhost bình thường qua nhánh `NODE_ENV` bên dưới.
 */
const PRODUCTION_ORIGIN = "https://t3-agent-forge.vercel.app";
const DEV_ORIGIN = "http://localhost:3000";

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ?? process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;

  return process.env.NODE_ENV === "production" ? PRODUCTION_ORIGIN : DEV_ORIGIN;
}

export const SITE_URL = resolveSiteUrl();

/**
 * `metadataBase` của Next cần một `URL`. Tách riêng để `sitemap.ts`/`robots.ts`
 * dùng lại đúng một nguồn sự thật thay vì tự ghép chuỗi.
 */
export const siteUrl = new URL(SITE_URL);

export const SITE_NAME = "AgentForge";
