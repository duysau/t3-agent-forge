"use client";

import { useEffect, useRef, useState } from "react";
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
  // Nhớ timeout đang chờ để một lượt sao chép mới có thể huỷ nó — nếu không,
  // timeout "tắt nhãn đã sao chép" của lượt TRƯỚC có thể tự bắn ra sau và ghi
  // đè lên trạng thái copied/copyError của lượt sau, dù lượt sau đã tự quyết
  // định trạng thái đúng của nó rồi.
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);
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
            // Mỗi lượt bấm mới huỷ timeout còn treo của lượt trước — nếu không,
            // timeout đó có thể bắn ra sau và ghi đè trạng thái copied/copyError
            // mà lượt này vừa mới quyết định.
            if (copiedTimeoutRef.current) {
              clearTimeout(copiedTimeoutRef.current);
              copiedTimeoutRef.current = null;
            }
            setCopyError(null);
            // navigator.clipboard có thể hoàn toàn không tồn tại (context không an
            // toàn) chứ không chỉ reject — nên bọc cả lời gọi, không riêng promise.
            void Promise.resolve()
              .then(() => navigator.clipboard.writeText(shareUrl))
              .then(() => {
                setCopied(true);
                copiedTimeoutRef.current = setTimeout(() => {
                  setCopied(false);
                  copiedTimeoutRef.current = null;
                }, 2000);
              })
              .catch(() => {
                // Đừng để nhãn "Đã sao chép" của lượt TRƯỚC còn hiện trong lúc
                // lượt này báo lỗi — nếu không UI vừa nói thành công vừa nói
                // thất bại cùng lúc.
                setCopied(false);
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
