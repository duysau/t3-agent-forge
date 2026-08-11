"use client";

import { useRef } from "react";
import { ArrowRight, Check, FileUp, Minus } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DegradedBadge } from "~/components/ui/degraded-badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Panel, PanelBody, PanelFoot, PanelSub, PanelTitle } from "~/components/ui/panel";
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

const FIELD_LABEL = "mb-[7px] block text-sm font-semibold text-gray-700";

export function Step1SourceView(p: Step1ViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Panel>
      <PanelBody>
        <PanelTitle>Gắn nguồn dữ liệu</PanelTitle>
        <PanelSub>
          Dán URL website doanh nghiệp. AgentForge crawl các trang chính và bóc text thành knowledge
          base. Có thể thêm PDF bảng giá hoặc catalogue.
        </PanelSub>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="url" className={FIELD_LABEL}>
              Website doanh nghiệp
            </Label>
            <div className="flex gap-2">
              <Input
                id="url"
                type="url"
                value={p.url}
                onChange={(e) => p.onUrlChange(e.target.value)}
                placeholder="https://senspa.vn"
                disabled={p.crawling}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-[15px] transition-[border-color,box-shadow] focus:border-primary focus:ring-4 focus:ring-fci-50 focus:outline-none"
              />
              <Button onClick={p.onCrawl} disabled={p.crawling || p.url.trim().length === 0}>
                {p.crawling ? "Đang crawl…" : "Crawl website"}
              </Button>
            </div>
            <p className="mt-[7px] text-[13px] text-gray-500">
              Crawl có thể mất tới 3 phút. Mất mạng hoặc backend lỗi sẽ tự chuyển sang kịch bản mẫu.
            </p>
          </div>

          <div>
            <Label className={FIELD_LABEL}>Tài liệu bổ sung (tuỳ chọn)</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={p.result === null || p.uploading}
              className="w-full cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-25 p-[26px] text-center text-gray-500 transition-all hover:border-fci-300 hover:bg-fci-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileUp className="mx-auto mb-2.5 size-[42px] text-fci-400" />
              <span className="block font-semibold text-gray-700">
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
              <p className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-fci-50 px-3 py-1.5 text-[13px] font-semibold text-fci-700">
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

        <div className="mt-[22px] border-t border-dashed border-border pt-[22px]">
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
                className="flex min-w-[210px] items-center gap-2.5 rounded-lg border border-gray-300 bg-white px-4 py-3 text-left transition-all hover:border-primary hover:shadow-sm disabled:opacity-50"
              >
                <span className="text-[22px]">{f.brand.logo}</span>
                <span>
                  <span className="block text-sm font-bold text-gray-900">{f.brand.name}</span>
                  <span className="block text-xs text-gray-500">
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
              <div className="mt-6 overflow-hidden rounded-xl border border-border">
                <div className="flex items-center gap-2.5 border-b border-border bg-gray-25 px-[18px] py-3.5 text-sm font-semibold">
                  Các trang đã crawl
                </div>
                <ul>
                  {p.result.pages.map((page) => (
                    <li key={page.url} className="flex items-center gap-3 px-[18px] py-2.5 text-sm">
                      {page.status === "ok" ? (
                        <Check className="size-3.5 shrink-0 text-success" />
                      ) : (
                        <Minus className="size-3.5 shrink-0 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-700">{page.title ?? page.url}</span>
                      <span className="ml-auto truncate font-mono text-[13px] text-gray-400">
                        {page.url}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.result.kbFacts.length > 0 && (
              <div className="mt-5 rounded-xl border border-fci-100 bg-fci-50 px-5 py-[18px]">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-fci-700">
                  <Check className="size-4" />
                  Facts trích xuất được
                </h4>
                <ul className="grid gap-2 md:grid-cols-2">
                  {p.result.kbFacts.map((fact) => (
                    <li key={fact} className="flex gap-2.5 text-sm text-gray-700">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </PanelBody>

      <PanelFoot>
        <span className="text-[13px] text-muted-foreground">
          {p.result ? "Nguồn đã sẵn sàng." : "Chọn một nguồn để tiếp tục."}
        </span>
        <Button onClick={p.onContinue} disabled={p.result === null}>
          Tiếp tục
          <ArrowRight className="size-4" />
        </Button>
      </PanelFoot>
    </Panel>
  );
}
