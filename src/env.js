import { createEnv } from "@t3-oss/env-nextjs";
import { clientSchema, serverSchema } from "./env-schema.js";

export const env = createEnv({
  server: serverSchema.shape,
  client: clientSchema.shape,
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    PYTHON_API_URL: process.env.PYTHON_API_URL,
    FALLBACK_TO_FIXTURE: process.env.FALLBACK_TO_FIXTURE,
    CRAWL_MAX_PAGES: process.env.CRAWL_MAX_PAGES,
    NEXT_PUBLIC_VOICE_GATEWAY_URL: process.env.NEXT_PUBLIC_VOICE_GATEWAY_URL,
    NEXT_PUBLIC_VOICE_PROFILE: process.env.NEXT_PUBLIC_VOICE_PROFILE,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
