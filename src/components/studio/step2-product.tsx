"use client";

import { api } from "~/trpc/react";
import { DEFAULT_VOICE_ID, type VoiceId } from "~/lib/voices";
import { Step2ProductView } from "./step2-product-view";

export function Step2Product({
  slug,
  product,
  voiceId,
  onSelectProduct,
  onVoiceChange,
  onBack,
  onSaved,
}: {
  slug: string;
  product: "chat" | "voice" | null;
  voiceId: string | null;
  onSelectProduct: (p: "chat" | "voice") => void;
  onVoiceChange: (id: string) => void;
  onBack: () => void;
  onSaved: () => void;
}) {
  const setProduct = api.agent.setProduct.useMutation({ onSuccess: onSaved });

  return (
    <Step2ProductView
      product={product}
      onSelect={onSelectProduct}
      voiceId={voiceId}
      onVoiceChange={onVoiceChange}
      onBack={onBack}
      saving={setProduct.isPending}
      onContinue={() => {
        if (!product) return;
        setProduct.mutate({
          slug,
          product,
          // voiceId ở wizard là string thô (Task 13 chưa biết về VoiceId); router
          // xác thực lại bằng zod enum nên ép kiểu ở đây là an toàn.
          voiceId: product === "voice" ? ((voiceId ?? DEFAULT_VOICE_ID) as VoiceId) : undefined,
        });
      }}
    />
  );
}
