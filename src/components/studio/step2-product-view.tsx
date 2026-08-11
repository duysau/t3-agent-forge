"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { VOICES } from "~/lib/voices";
import { cn } from "~/lib/utils";

type Product = "chat" | "voice";

const CARDS: Array<{
  product: Product;
  kicker: string;
  title: string;
  desc: string;
  bullets: string[];
}> = [
  {
    product: "chat",
    kicker: "Chatbot đa kênh",
    title: "FPT AI Chat",
    desc: "Chatbot trả lời trên website, Zalo, Facebook, app. Phù hợp CSKH, tư vấn dịch vụ, giải đáp FAQ.",
    bullets: [
      "Widget chat nhúng vào web khách",
      "Trả lời text tức thì, có gợi ý câu hỏi",
      "Demo: chat thử ngay trong trình duyệt",
    ],
  },
  {
    product: "voice",
    kicker: "Voicebot tổng đài",
    title: "FPT AI Engage",
    desc: "Voicebot gọi ra và nghe máy tự động cho call center. Phù hợp đặt lịch, đặt bàn, nhắc lịch, khảo sát.",
    bullets: [
      "Giọng TTS tối ưu tiếng Việt",
      "Hiểu ý định, xác nhận thông tin qua thoại",
      "Demo: nghe cuộc gọi mẫu và nói trực tiếp qua mic",
    ],
  },
];

export function Step2ProductView({
  product,
  onSelect,
  voiceId,
  onVoiceChange,
  onBack,
  onContinue,
  saving,
}: {
  product: Product | null;
  onSelect: (p: Product) => void;
  voiceId: string | null;
  onVoiceChange: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
  saving: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chọn sản phẩm FPT.AI</CardTitle>
        <CardDescription>
          Cùng một nguồn dữ liệu — chọn hình thái agent. Hệ thống dựng demo theo đúng sản phẩm được
          chọn.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-5 md:grid-cols-2">
          {CARDS.map((c) => {
            const selected = product === c.product;
            return (
              <button
                key={c.product}
                type="button"
                onClick={() => onSelect(c.product)}
                aria-pressed={selected}
                className={cn(
                  "rounded-2xl border-2 p-5 text-left transition-all",
                  selected
                    ? "border-primary bg-accent shadow-glow"
                    : "border-border bg-card hover:border-fci-300",
                )}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-fci-600">
                  {c.kicker}
                </span>
                <h3 className="mt-1 text-lg font-bold text-gray-900">{c.title}</h3>
                <p className="mt-2 text-[15px] text-gray-600">{c.desc}</p>
                <ul className="mt-3 space-y-1.5">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-[13px] text-gray-700">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                      {b}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {product === "voice" && (
          <div className="mt-6 max-w-sm">
            <Label htmlFor="voice">Giọng đọc voicebot</Label>
            <Select value={voiceId ?? VOICES[0].id} onValueChange={onVoiceChange}>
              <SelectTrigger id="voice" className="mt-1.5 w-full">
                <SelectValue placeholder="Chọn giọng" />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
        <Button onClick={onContinue} disabled={product === null || saving}>
          {saving ? "Đang lưu…" : "Dựng agent"}
          {!saving && <ArrowRight className="size-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
