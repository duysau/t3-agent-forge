import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { env } from "~/env";
import { resolveSource } from "~/server/agentforge/resolve";
import { AgentForgeError } from "~/server/agentforge/errors";
import { ingestDocument } from "~/server/services/document-upload";
import type { Db } from "~/server/db/types";

export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10MB, khớp với hint trong prototype

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ detail: "Body không phải multipart/form-data" }, { status: 400 });
  }

  const slug = form.get("slug");
  const file = form.get("file");

  if (typeof slug !== "string" || slug.length === 0) {
    return NextResponse.json({ detail: "Thiếu slug" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "Thiếu file" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ detail: "Chỉ hỗ trợ file PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ detail: "File vượt quá 10MB" }, { status: 400 });
  }

  try {
    const result = await ingestDocument(
      {
        db: db as unknown as Db,
        source: resolveSource({ mode: "live", baseUrl: env.PYTHON_API_URL }),
      },
      { slug, file },
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AgentForgeError) {
      const status = err.kind === "bad_request" ? 400 : err.kind === "upstream" ? 502 : 500;
      return NextResponse.json({ detail: err.detail ?? err.message }, { status });
    }
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
