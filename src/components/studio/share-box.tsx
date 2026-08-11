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
}: {
  url: string;
  qrDataUrl: string | null;
  onShowQr: () => void;
  copied: boolean;
  onCopy: () => void;
  copyError?: string | null;
}) {
  return (
    <div className="mt-6 rounded-xl border border-border p-5">
      <h4 className="text-sm font-bold text-gray-900">Chia sẻ trang demo</h4>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Gửi link này cho đồng nghiệp để xem thử — không cần đăng nhập.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-[13px]">
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
