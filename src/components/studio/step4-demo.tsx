"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { BrandBar } from "~/components/demo/brand-bar";
import { ChatDemo } from "~/components/demo/chat-demo";
import { api } from "~/trpc/react";
import { toQrDataUrl } from "~/lib/qr";
import { ShareBox } from "./share-box";

// navigator.clipboard chỉ tồn tại trong secure context — localhost thì có,
// nhưng demo chạy trên IP LAN qua HTTP thường thì không. Khi đó promise reject
// và nếu ta chỉ `void` nó, người dùng bấm "Sao chép" mà không có phản hồi gì —
// hư hỏng thầm lặng trên đúng cái nút quan trọng nhất của sản phẩm.
const CLIPBOARD_FALLBACK_MESSAGE =
  "Không tự sao chép được — hãy bôi đen và chép link ở trên (Ctrl+C).";

export function Step4Demo({ slug, onBack }: { slug: string; onBack: () => void }) {
  const demo = api.demo.bySlug.useQuery({ slug });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  const shareUrl = origin ? `${origin}/s/${slug}` : `/s/${slug}`;

  if (demo.isPending) {
    return <p className="text-sm text-muted-foreground">Đang tải trang demo…</p>;
  }
  if (demo.error || !demo.data) {
    return (
      <p className="rounded-xl bg-error-muted px-4 py-3 text-sm text-error-strong">
        {demo.error?.message ?? "Không tải được trang demo"}
      </p>
    );
  }

  const d = demo.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trang demo chia sẻ được</CardTitle>
        <CardDescription>
          Trang demo mang branding của khách. Chat thử rồi gửi link cho người khác xem.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-2xl border border-border">
          <BrandBar
            name={d.brandName}
            letter={d.brandLogoLetter}
            emoji={d.brandLogoEmoji}
            color={d.brandColor}
            product={d.product}
            degraded={d.degraded}
          />
          <ChatDemo slug={slug} suggested={d.kbFacts.slice(0, 3)} />
        </div>

        <ShareBox
          url={shareUrl}
          qrDataUrl={qrDataUrl}
          copied={copied}
          copyError={copyError}
          onCopy={() => {
            setCopyError(null);
            // navigator.clipboard có thể hoàn toàn không tồn tại (context không an
            // toàn) chứ không chỉ reject — nên bọc cả lời gọi, không riêng promise.
            void Promise.resolve()
              .then(() => navigator.clipboard.writeText(shareUrl))
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
              .catch(() => {
                setCopyError(CLIPBOARD_FALLBACK_MESSAGE);
              });
          }}
          onShowQr={() => void toQrDataUrl(shareUrl).then(setQrDataUrl)}
        />
      </CardContent>

      <CardFooter className="border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
      </CardFooter>
    </Card>
  );
}
