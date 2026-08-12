"use client";

import { Check, Copy, QrCode } from "lucide-react";
import { Button } from "~/components/ui/button";

export function ShareBox({
  url,
  qrDataUrl,
  onShowQr,
  copied,
  onCopy,
  copyError,
  qrError,
}: {
  url: string;
  qrDataUrl: string | null;
  onShowQr: () => void;
  copied: boolean;
  onCopy: () => void;
  copyError?: string | null;
  qrError?: string | null;
}) {
  return (
    <div className="mt-6 rounded-xl border border-fci-100 bg-fci-50 px-[22px] py-5">
      <h4 className="mb-1 text-[15px] font-extrabold text-fci-800">Chia sẻ trang demo</h4>
      <p className="mb-3.5 text-sm text-gray-600">
        Gửi link này cho đồng nghiệp để xem thử — không cần đăng nhập.
      </p>

      <div className="flex flex-wrap gap-2.5">
        {/*
          `{url}` phải là NÚT VĂN BẢN DUY NHẤT trong ô này — không bọc thêm span
          nào quanh nó. `screen.getByText(URL)` (share-box.test.tsx và
          step4-demo.test.tsx) tìm theo text node trực tiếp của một phần tử; tách
          URL ra nhiều phần tử con là cách chắc chắn nhất làm test đó hết khớp.
        */}
        <code className="flex min-w-[260px] flex-1 items-center gap-2.5 rounded-lg border border-gray-300 bg-surface px-3.5 py-2.5 font-mono text-sm text-gray-600">
          {url}
        </code>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Đã sao chép" : "Sao chép"}
        </Button>
        <Button variant="outline" size="sm" onClick={onShowQr}>
          <QrCode className="size-4" />
          Mã QR
        </Button>
      </div>

      {copyError && (
        <p className="mt-2 text-[13px] text-error-strong">{copyError}</p>
      )}

      {qrError && <p className="mt-2 text-[13px] text-error-strong">{qrError}</p>}

      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL, không qua next/image
        <img
          src={qrDataUrl}
          alt="Mã QR của link demo"
          width={220}
          height={220}
          className="mt-4 rounded-lg border border-border"
        />
      )}
    </div>
  );
}
