"use client";

import { ArrowRight, Check, FileUp, Minus, TriangleAlert } from "lucide-react";
import { useRef } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DegradedBadge } from "~/components/ui/degraded-badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Panel, PanelBody, PanelFoot, PanelSub, PanelTitle } from "~/components/ui/panel";
import { type FixtureKey } from "~/lib/fixtures";

export interface Step1Result {
  pages: Array<{ url: string; title: string | null; status: string }>;
  kbFacts: string[];
  /**
   * `"llm"` bình thường; `"heuristic"` nghĩa là backend đã rơi về fallback vì LLM
   * lỗi/timeout, và facts chỉ là dòng đầu mỗi chunk. `null` với backend cũ chưa trả
   * field này. Chỉ `"heuristic"` mới bật cảnh báo — giá trị lạ thì im lặng, vì đây là
   * tín hiệu tư vấn, không phải điều kiện chặn.
   */
  factsSource: string | null;
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

/**
 * Dòng chữ dưới thanh chờ, đổi theo thời gian đã trôi.
 *
 * Vì sao cần: crawl là bước chờ lâu nhất mà người dùng phải ngồi nhìn — tới 20
 * trang, và client chỉ tự dừng ở 300 giây (`TIMEOUTS.crawl`). Một thanh chạy không
 * kèm lời nào, sau một phút, trông y như treo; người dùng sẽ bấm lại hoặc rời trang,
 * và cả hai đều mất lượt crawl đang chạy dở (backend vẫn crawl tới cùng, nhưng
 * không ai nhận kết quả nữa).
 *
 * Mọi con số ở đây là số THẬT, không phải lời an ủi: 300 giây là trần
 * `TIMEOUTS.crawl` của client.
 */
export function crawlHint(elapsedSeconds: number): string {
  if (elapsedSeconds >= 150) {
    return "Vẫn đang chạy. Quá 5 phút thì lượt crawl tự dừng và báo lỗi — lúc đó thử lại với site khác hoặc dùng kịch bản mẫu.";
  }
  if (elapsedSeconds >= 45) {
    return "Site nhiều trang thì lâu hơn — cứ để yên trang này, đừng bấm lại.";
  }
  return "Bóc text từ các trang chính của site, thường mất 1–3 phút. Cứ để yên trang này.";
}

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

        <div className="grid gap-6 min-[900px]:grid-cols-2">
          <div>
            <Label htmlFor="url" className={FIELD_LABEL}>
              Website doanh nghiệp
            </Label>
            <div className="flex gap-2">
              {/*
                Ba class dưới đây tồn tại chỉ để thắng phần base của `Input` (shadcn),
                vì `cn()` là twMerge — nó chỉ gỡ xung đột TRONG CÙNG nhóm utility:
                - `h-auto` gỡ `h-9` (36px) của base. Không thể dựa vào `py-3` để cao lên
                  được: `h-*` và `py-*` khác nhóm nên base giữ nguyên 36px và padding bị
                  ép bên trong. Chọn `h-auto` thay vì ghim `h-[47px]` để chiều cao vẫn do
                  padding + font-size quyết định, đúng cơ chế của `.input` prototype
                  (`padding:12px 14px; font-size:15px` — khớp `px-3.5 py-3 text-[15px]`).
                - `md:text-[15px]` gỡ `md:text-sm` của base. Chỉ `text-[15px]` là không đủ:
                  khác modifier nên twMerge giữ cả hai, và `md:text-sm` nằm trong media
                  query nên thắng từ 768px lên — tức cỡ chữ 15px chết trên mọi màn desktop.
                - `focus-visible:` (không phải `focus:`) để gỡ đúng
                  `focus-visible:border-ring/ring-3/ring-ring/50` của base, nếu không viền
                  focus của prototype (`--primary` + `0 0 0 4px var(--fci-50)`) không bao
                  giờ hiện. `focus:outline-none` cũ đã bỏ: base có `outline-none` vô điều kiện.
              */}
              <Input
                id="url"
                type="url"
                value={p.url}
                onChange={(e) => p.onUrlChange(e.target.value)}
                placeholder="https://senspa.vn"
                disabled={p.crawling}
                className="h-auto w-full rounded-lg border border-gray-300 bg-surface px-3.5 py-3 text-[15px] transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-fci-50 md:text-[15px]"
              />
              {/*
                `h-auto self-stretch` để nút cao đúng bằng ô nhập bên cạnh: `size:
                default` của `Button` ghim `h-9` (36px), còn ô nhập cao ~47px vì chiều
                cao của nó do padding sinh ra (`py-3` + `text-[15px]`, xem chú thích
                phía trên). `h-auto` gỡ `h-9` — cùng nhóm utility nên twMerge cho
                className thắng — rồi `self-stretch` để nút lấy chiều cao của hàng
                flex. KHÔNG ghim một con số (`h-[47px]`): đổi padding ô nhập là lệch lại
                ngay, và lần đó sẽ không ai nhớ tới dòng này.
              */}
              <Button
                onClick={p.onCrawl}
                disabled={p.crawling || p.url.trim().length === 0}
                className="h-auto self-stretch px-4"
              >
                {p.crawling ? "Đang crawl…" : "Crawl website"}
              </Button>
            </div>
          </div>

          <div>
            <Label className={FIELD_LABEL}>Tài liệu bổ sung (tuỳ chọn)</Label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={p.result === null || p.uploading}
              className="w-full cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-25 p-[26px] text-center text-gray-500 transition-all outline-none hover:border-fci-300 hover:bg-fci-50 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
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

        {p.crawling && (
          // `role="status"` bọc CẢ khối: người không nhìn màn hình cần biết cả việc
          // đang chạy, thời gian đã trôi, và dòng trấn an — chứ không riêng tiêu đề.
          <div
            role="status"
            className="animate-panel-fade mt-6 rounded-xl border border-border bg-gray-25 p-4"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm font-semibold text-gray-700">Đang crawl website…</span>
              {/* `tabular-nums` để số giây không làm cả dòng nhảy mỗi giây khi bề
                  rộng chữ số thay đổi. */}
              <span className="ml-auto font-mono text-[13px] tabular-nums text-muted-foreground">
                {p.elapsedSeconds} giây
              </span>
            </div>

            {/*
              Thanh KHÔNG XÁC ĐỊNH, có chủ đích: backend không stream tiến độ nên
              không có phần trăm thật nào để hiển thị.

              Bản trước là `w-1/3` + `animate-pulse` — nó đứng yên ở một phần ba và
              chỉ mờ dần, nên đọc ra thành "tiến độ 33% và đang kẹt": vừa bịa một con
              số, vừa trông như treo sau nửa phút. Đoạn chạy ngang thì không nói gì về
              tiến độ cả, chỉ nói "vẫn đang làm".

              KHÔNG có `aria-valuenow`: theo ARIA, một progressbar thiếu thuộc tính đó
              nghĩa là "không biết tiến độ" — đúng sự thật ở đây.
            */}
            <div
              role="progressbar"
              aria-label="Đang crawl website"
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="animate-indeterminate h-full w-[30%] rounded-full bg-primary" />
            </div>

            <p className="mt-2.5 text-[13px] text-muted-foreground">{crawlHint(p.elapsedSeconds)}</p>
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
                      <span className="ml-auto truncate font-mono text-[13px] text-gray-500">
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
                {/*
                  Chỉ so đúng chuỗi "heuristic". Giá trị lạ (backend thêm loại mới) thì
                  không cảnh báo gì — đây là tín hiệu tư vấn, không phải điều kiện chặn,
                  nên đoán sai hướng "im lặng" rẻ hơn hướng "báo động sai".
                */}
                {p.result.factsSource === "heuristic" && (
                  <p
                    data-testid="facts-heuristic-warning"
                    className="mb-3 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning-muted px-3 py-2 text-[13px] text-warning-strong"
                  >
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      Facts dưới đây lấy bằng phương án dự phòng (LLM trích xuất lỗi hoặc quá
                      thời gian), nên chỉ là dòng đầu mỗi đoạn văn bản. Nên crawl lại; nếu vẫn
                      vậy thì bảng điểm ở Bước 3 sẽ kém tin cậy hơn bình thường.
                    </span>
                  </p>
                )}

                <ul className="flex flex-col gap-2.25">
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
