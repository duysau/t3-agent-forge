/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { env } from "~/env";
import { resolveSource } from "~/server/agentforge/resolve";
import { AgentForgeError } from "~/server/agentforge/errors";
import { logBoundary } from "~/server/agentforge/log";
import type { Db } from "~/server/db/types";
import type { AgentForgeSource } from "~/server/agentforge/source";

/**
 * Message chung khi lỗi không xác định (driver DB chết, null deref, ...) lộ ra
 * client. Không bao giờ để message gốc (thường là tiếng Anh, có thể lộ chi tiết
 * hạ tầng như host:port) tới người dùng — xem `mapErrors` bên dưới.
 */
export const GENERIC_ERROR_MESSAGE = "Hệ thống gặp lỗi không mong muốn. Vui lòng thử lại.";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the AgentForge
 * source, and whether fallback to fixture data is enabled.
 *
 * @see https://trpc.io/docs/server/context
 */
export interface TrpcContext {
  db: Db;
  source: AgentForgeSource;
  fallbackEnabled: boolean;
}

export const createTRPCContext = async (_opts: { headers: Headers }): Promise<TrpcContext> => ({
  db: db as unknown as Db,
  source: resolveSource({ mode: "live", baseUrl: env.PYTHON_API_URL }),
  fallbackEnabled: env.FALLBACK_TO_FIXTURE,
});

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const cause = error.cause;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: cause instanceof ZodError ? cause.flatten() : null,
        agentForgeKind: cause instanceof AgentForgeError ? cause.kind : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Biên lỗi cho MỌI procedure — không riêng AgentForgeError. Ba trường hợp, theo thứ tự:
 *
 * 1. `AgentForgeError` → map thành `TRPCError` đúng code, giữ `detail` làm message —
 *    detail đã là tiếng Việt và có chủ đích, không phải che giấu.
 * 2. Bất cứ `TRPCError` nào KHÁC có code cụ thể — `BAD_REQUEST` từ Zod (input schema
 *    tự raise cái này khi parse lỗi, `cause` là `ZodError`), `NOT_FOUND` một procedure
 *    tự raise, hoặc bất kỳ `TRPCError` nào khác kèm `cause` riêng — giữ nguyên vẹn.
 *    Một code cụ thể (khác `INTERNAL_SERVER_ERROR`) đã mang chủ đích, không phải lỗi
 *    lạ cần che.
 * 3. Auto-wrap `INTERNAL_SERVER_ERROR` từ một throw không xác định (driver DB chết,
 *    null deref, lỗi không lường trước...) → log qua `logBoundary` để giữ nguyên nhân
 *    thật trong log server, rồi thay bằng `TRPCError` với message chung. Message gốc
 *    — thường tiếng Anh, có thể lộ chi tiết hạ tầng như host:port của DB — KHÔNG được
 *    lọt tới client.
 *
 * QUAN TRỌNG về cách bắt lỗi: trên @trpc/server 11.18, `next()` KHÔNG throw khi
 * procedure/middleware phía dưới lỗi — nó resolve về `{ ok: false, error }` (đã tự
 * bọc thành `TRPCError` bởi lõi tRPC, xem `getTRPCErrorFromUnknown`). Một
 * `try { return await next() } catch {}` quanh nó — mẫu vẫn thấy trong tài liệu cũ —
 * KHÔNG BAO GIỜ vào catch với lỗi từ tầng dưới, nên toàn bộ việc map lỗi phía trên
 * (kể cả case AgentForgeError) sẽ là dead code và message gốc lộ thẳng ra ngoài.
 * Xác nhận bằng cách chạy trực tiếp qua `initTRPC` với `console.log` bên trong
 * middleware: lỗi từ resolver luôn tới đây dưới dạng `result.error`, không bao giờ
 * qua nhánh catch. Vì vậy phải kiểm `result.ok` thay vì bắt exception.
 *
 * Cách phân biệt case 2 và case 3 KHÔNG dựa vào `cause` có mặt hay không (một
 * `TRPCError` được raise trực tiếp vẫn có thể kèm `cause` riêng, ví dụ `BAD_REQUEST`
 * từ Zod luôn có `cause` là `ZodError`) — dựa vào `code`. Lõi tRPC (`getTRPCErrorFromUnknown`)
 * CHỈ gắn code `INTERNAL_SERVER_ERROR` khi tự bọc một throw không nhận dạng được;
 * mọi `TRPCError` mang code cụ thể khác đã được raise có chủ đích (bởi input schema
 * hoặc bởi chính procedure) và không được ghi đè.
 */
const mapErrors = t.middleware(async ({ next, path }) => {
  const result = await next();
  if (result.ok) return result;

  const cause = result.error.cause;

  if (cause instanceof AgentForgeError) {
    const code =
      cause.kind === "bad_request"
        ? "BAD_REQUEST"
        : cause.kind === "upstream"
          ? "BAD_GATEWAY"
          : cause.kind === "timeout"
            ? "TIMEOUT"
            : "INTERNAL_SERVER_ERROR";
    return {
      ...result,
      error: new TRPCError({ code, message: cause.detail ?? cause.message, cause }),
    };
  }

  if (result.error.code !== "INTERNAL_SERVER_ERROR") {
    // Code cụ thể => đã được raise có chủ đích (Zod BAD_REQUEST, NOT_FOUND, ...).
    return result;
  }

  logBoundary("trpc:unhandled", {
    path,
    detail: cause instanceof Error ? cause.message : String(cause),
  });
  return {
    ...result,
    error: new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: GENERIC_ERROR_MESSAGE,
      cause,
    }),
  };
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(mapErrors);
