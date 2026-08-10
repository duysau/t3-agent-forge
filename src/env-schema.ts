import { z } from "zod";

const booleanFromString = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .default(true)
  .transform((v) => (typeof v === "boolean" ? v : v === "true"));

export const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  PYTHON_API_URL: z.string().url(),
  FALLBACK_TO_FIXTURE: booleanFromString,
  CRAWL_MAX_PAGES: z.coerce.number().int().min(1).max(20).default(5),
});

export const clientSchema = z.object({
  NEXT_PUBLIC_PYTHON_WS_URL: z.string().url(),
});
