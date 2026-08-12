"use client";

import { api } from "~/trpc/react";
import { DEFAULT_VOICE_ID } from "~/lib/voices";
import { Step2ProductView } from "./step2-product-view";

export function Step2Product({
  slug,
  product,
  onSelectProduct,
  onBack,
  onSaved,
}: {
  slug: string;
  product: "chat" | "voice" | null;
  onSelectProduct: (p: "chat" | "voice") => void;
  onBack: () => void;
  onSaved: () => void;
}) {
  const setProduct = api.agent.setProduct.useMutation({ onSuccess: onSaved });

  return (
    <Step2ProductView
      product={product}
      onSelect={onSelectProduct}
      onBack={onBack}
      saving={setProduct.isPending}
      onContinue={() => {
        if (!product) return;
        setProduct.mutate({
          slug,
          product,
          // Luôn là giọng mặc định: người dùng không còn chọn giọng ở Bước 2 (giọng
          // do agent voice của nền tảng quyết định — xem `Step2ProductView`). Vẫn
          // gửi để cột `voiceId` có giá trị và contract của router không đổi.
          voiceId: product === "voice" ? DEFAULT_VOICE_ID : undefined,
        });
      }}
    />
  );
}
