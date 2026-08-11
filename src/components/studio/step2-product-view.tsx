"use client";

import { ArrowLeft, ArrowRight, Check, MessageSquare, Mic } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Panel, PanelBody, PanelFoot, PanelSub, PanelTitle } from "~/components/ui/panel";
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
  icon: ComponentType<{ className?: string }>;
  iconBoxClassName: string;
  kicker: string;
  title: string;
  desc: string;
  bullets: string[];
}> = [
  {
    product: "chat",
    icon: MessageSquare,
    iconBoxClassName: "bg-gradient-to-br from-fci-400 to-fci-500",
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
    icon: Mic,
    iconBoxClassName: "bg-gradient-to-br from-success to-[#0a8f52]",
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
    <Panel>
      <PanelBody>
        <PanelTitle>Chọn sản phẩm FPT.AI</PanelTitle>
        <PanelSub>
          Cùng một nguồn dữ liệu — chọn hình thái agent. Hệ thống dựng demo theo đúng sản phẩm được
          chọn.
        </PanelSub>

        <div className="grid gap-5 min-[900px]:grid-cols-2">
          {CARDS.map((c) => {
            const selected = product === c.product;
            const Icon = c.icon;
            return (
              <button
                key={c.product}
                type="button"
                onClick={() => onSelect(c.product)}
                aria-pressed={selected}
                className={cn(
                  "relative cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-[26px] text-left transition-all hover:-translate-y-0.5 hover:border-fci-300 hover:shadow-lg",
                  selected && "border-primary shadow-glow",
                )}
              >
                {selected && (
                  <span
                    aria-hidden
                    className="absolute top-4 right-4 grid size-7 place-items-center rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground"
                  >
                    ✓
                  </span>
                )}
                <div
                  className={cn(
                    "mb-4 grid size-14 place-items-center rounded-xl",
                    c.iconBoxClassName,
                  )}
                >
                  <Icon className="size-[30px] text-white" />
                </div>
                <span className="text-xs font-bold tracking-[0.06em] uppercase text-gray-400">
                  {c.kicker}
                </span>
                <h3 className="mt-1 text-xl font-extrabold tracking-[-0.01em]">{c.title}</h3>
                <p className="my-2.5 text-sm text-gray-600">{c.desc}</p>
                <ul className="mt-3 space-y-1.5">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex gap-2.5 text-[13.5px] text-gray-700">
                      <Check className="mt-px size-[17px] shrink-0 text-success" />
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
      </PanelBody>

      <PanelFoot>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
        <Button onClick={onContinue} disabled={product === null || saving}>
          {saving ? "Đang lưu…" : "Dựng agent"}
          {!saving && <ArrowRight className="size-4" />}
        </Button>
      </PanelFoot>
    </Panel>
  );
}
