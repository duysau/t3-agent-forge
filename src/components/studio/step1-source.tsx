"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import type { FixtureKey } from "~/lib/fixtures";
import { FIXTURES } from "~/lib/fixtures";
import { Step1SourceView, type Step1Result } from "./step1-source-view";

export function Step1Source({
  onReady,
  onContinue,
}: {
  onReady: (slug: string) => void;
  onContinue: () => void;
}) {
  const [url, setUrl] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [result, setResult] = useState<Step1Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [pdf, setPdf] = useState<{ fileName: string; chunks: number; pages: number } | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const crawl = api.source.crawl.useMutation({
    onMutate: () => {
      setError(null);
      setResult(null);
      setElapsed(0);
      timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    },
    onSuccess: (data) => {
      setSlug(data.slug);
      setResult({
        pages: data.pages,
        kbFacts: data.kbFacts,
        factsSource: data.factsSource,
        totalChunks: data.totalChunks,
        degraded: data.degraded,
        brandName: data.brand.name,
      });
      onReady(data.slug);
    },
    onError: (err) => setError(err.message),
    onSettled: () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    },
  });

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  async function uploadPdf(file: File) {
    if (!slug) return;
    setPdfError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set("slug", slug);
      form.set("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const body = (await res.json()) as
        | { fileName: string; chunks: number; pages: number; kbChunkCount: number }
        | { detail: string };
      if (!res.ok || "detail" in body) {
        setPdfError("detail" in body ? body.detail : "Nạp PDF thất bại");
        return;
      }
      setPdf({ fileName: body.fileName, chunks: body.chunks, pages: body.pages });
      // Nạp PDF không tụt hạng (xem Task 12), nên `degraded` của agent không đổi ở đây —
      // chỉ tổng số chunk thay đổi vì KB vừa được chụp lại.
      setResult((r) => (r ? { ...r, totalChunks: body.kbChunkCount } : r));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Step1SourceView
      url={url}
      onUrlChange={setUrl}
      onCrawl={() => crawl.mutate({ url, mode: "live" })}
      onPickExample={(key: FixtureKey) => {
        const fixtureUrl = FIXTURES[key].sourceUrl;
        setUrl(fixtureUrl);
        crawl.mutate({ url: fixtureUrl, mode: "fixture", fixtureKey: key });
      }}
      crawling={crawl.isPending}
      elapsedSeconds={elapsed}
      result={result}
      error={error}
      pdf={pdf}
      pdfError={pdfError}
      uploading={uploading}
      onPickPdf={(f) => void uploadPdf(f)}
      onContinue={onContinue}
    />
  );
}
