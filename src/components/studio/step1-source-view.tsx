"use client";

import { useRef } from "react";
import { ArrowRight, Check, FileUp, Minus } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { DegradedBadge } from "~/components/ui/degraded-badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FIXTURES, type FixtureKey } from "~/lib/fixtures";

export interface Step1Result {
  pages: Array<{ url: string; title: string | null; status: string }>;
  kbFacts: string[];
  totalChunks: number;
  degraded: boolean;
  brandName: string | null;
}

export interface Step1ViewProps {
  url: string;
  onUrlChange: (url: string) => void;
  onCrawl: () => void;
  onPickExample: (key: FixtureKey) => void;
  crawling: boolean;
  elapsedSeconds: number;
  result: Step1Result | null;
  error: string | null;
  pdf: { fileName: string; chunks: number; pages: number } | null;
  pdfError: string | null;
  uploading: boolean;
  onPickPdf: (file: File) => void;
  onContinue: () => void;
}

export function Step1SourceView(p: Step1ViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gắn nguồn dữ liệu</CardTitle>
        <CardDescription>
          Dán URL website doanh nghiệp. AgentForge crawl các trang chính và bóc text thành knowledge
          base. Có thể thêm PDF bảng giá hoặc catalogue.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="url">Website doanh nghiệp</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="url"
                type="url"
                value={p.url}
                onChange={(e) => p.onUrlChange(e.target.value)}
                placeholder="https://senspa.vn"
                disabled={p.crawling}
              />
              <Button onClick={p.onCrawl} disabled={p.crawling || p.url.trim().length === 0}>
                {p.crawling ? "Đang crawl…" : "Crawl website"}
              </Button>
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Crawl có thể mất tới 3 phút. Mất mạng hoặc backend lỗi sẽ tự chuyển sang kịch bản mẫu.
            </p>
          </div>

          <div>
            <Label>Tài liệu bổ sung (tuỳ chọn)</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={p.result === null || p.uploading}
              aria-label={p.uploading ? "Đang nạp PDF…" : "Chọn PDF bảng giá / catalogue"}
              className="mt-1.5 w-full rounded-xl border-2 border-dashed border-input px-4 py-6 text-center transition-colors hover:border-fci-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileUp className="mx-auto size-6 text-gray-400" />
              <span className="mt-2 block font-semibold text-gray-700">
                {p.uploading ? "Đang nạp PDF…" : "Chọn PDF bảng giá / catalogue"}
              </span>
              <span className="mt-1 block text-[13px] text-muted-foreground">
                {p.result === null ? "Crawl website trước đã" : "tối đa 10MB"}
              </span>
            </button>
            <input
              ref={fileRef}
              data-testid="pdf-input"
              type="file"
              accept="application/pdf"
              disabled={p.result === null || p.uploading}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) p.onPickPdf(f);
              }}
            />
            {p.pdf && (
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-success-strong">
                <Check className="size-3.5" />
                {p.pdf.fileName} — {p.pdf.chunks} chunk từ {p.pdf.pages} trang
              </p>
            )}
            {p.pdfError && (
              <p className="mt-2 rounded-lg bg-error-muted px-3 py-2 text-[13px] text-error-strong">
                {p.pdfError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-7 rounded-xl bg-muted p-4">
          <span className="block text-sm font-semibold text-gray-700">
            Hoặc dùng kịch bản mẫu (chạy offline, không phụ thuộc mạng)
          </span>
          <div className="mt-3 flex flex-wrap gap-3">
            {(Object.values(FIXTURES)).map((f) => (
              <button
                key={f.key}
                type="button"
                disabled={p.crawling}
                onClick={() => p.onPickExample(f.key)}
                className="flex items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 py-2.5 text-left shadow-xs transition-colors hover:border-fci-400 disabled:opacity-50"
              >
                <span className="text-xl">{f.brand.logo}</span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{f.brand.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {f.domain} · {f.brand.industry}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {p.crawling && (
          <div className="mt-6 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Đang crawl website…</span>
              <span className="font-mono text-[13px] text-muted-foreground">
                {p.elapsedSeconds} giây
              </span>
            </div>
            {/* Indeterminate có ý thức: backend không stream tiến độ nên không có
                phần trăm thật để hiển thị. Thà đập nhịp còn hơn bịa con số. */}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        )}

        {p.error && (
          <p className="mt-6 rounded-xl bg-error-muted px-4 py-3 text-sm text-error-strong">
            {p.error}
          </p>
        )}

        {p.result && (
          <div className="mt-6 rounded-xl border border-border p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-bold text-gray-900">Knowledge base đã trích xuất</h3>
              <Badge variant="success">{p.result.kbFacts.length} facts</Badge>
              <Badge variant="secondary">{p.result.totalChunks} chunk</Badge>
              {p.result.degraded && <DegradedBadge />}
            </div>

            {p.result.pages.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {p.result.pages.map((page) => (
                  <li key={page.url} className="flex items-center gap-2 text-[13px]">
                    {page.status === "ok" ? (
                      <Check className="size-3.5 shrink-0 text-success" />
                    ) : (
                      <Minus className="size-3.5 shrink-0 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-700">{page.title ?? page.url}</span>
                    <span className="truncate font-mono text-xs text-gray-400">{page.url}</span>
                  </li>
                ))}
              </ul>
            )}

            {p.result.kbFacts.length > 0 && (
              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {p.result.kbFacts.map((fact) => (
                  <li key={fact} className="rounded-lg bg-accent px-3 py-2 text-[13px] text-fci-800">
                    {fact}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between border-t">
        <span className="text-[13px] text-muted-foreground">
          {p.result ? "Nguồn đã sẵn sàng." : "Chọn một nguồn để tiếp tục."}
        </span>
        <Button onClick={p.onContinue} disabled={p.result === null}>
          Tiếp tục
          <ArrowRight className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
