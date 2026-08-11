"use client";

import { useCallback, useState } from "react";

export type StepNumber = 1 | 2 | 3 | 4;
export type Product = "chat" | "voice";

export const STEPS: ReadonlyArray<{ n: StepNumber; kicker: string; title: string }> = [
  { n: 1, kicker: "Bước 1", title: "Gắn nguồn" },
  { n: 2, kicker: "Bước 2", title: "Chọn sản phẩm" },
  { n: 3, kicker: "Bước 3", title: "Dựng & kiểm định" },
  { n: 4, kicker: "Bước 4", title: "Demo chia sẻ" },
];

export interface WizardState {
  step: StepNumber;
  slug: string | null;
  product: Product | null;
  voiceId: string | null;
  evaluated: boolean;
  canGoTo(n: StepNumber): boolean;
  goTo(n: StepNumber): void;
  next(): void;
  back(): void;
  setSlug(slug: string): void;
  setProduct(product: Product): void;
  setVoiceId(voiceId: string): void;
  setEvaluated(value: boolean): void;
  reset(): void;
}

export function useWizard(opts: { initialSlug?: string | null } = {}): WizardState {
  const [step, setStep] = useState<StepNumber>(1);
  const [slug, setSlugState] = useState<string | null>(opts.initialSlug ?? null);
  const [product, setProductState] = useState<Product | null>(null);
  const [voiceId, setVoiceIdState] = useState<string | null>(null);
  const [evaluated, setEvaluated] = useState(false);

  const canGoTo = useCallback(
    (n: StepNumber): boolean => {
      if (n === 1) return true;
      if (n === 2) return slug !== null;
      if (n === 3) return slug !== null && product !== null;
      return slug !== null && product !== null && evaluated;
    },
    [slug, product, evaluated],
  );

  const goTo = useCallback(
    (n: StepNumber) => {
      if (canGoTo(n)) setStep(n);
    },
    [canGoTo],
  );

  const next = useCallback(() => {
    const target = Math.min(step + 1, 4) as StepNumber;
    goTo(target);
  }, [step, goTo]);

  const back = useCallback(() => {
    setStep((s) => (Math.max(s - 1, 1) as StepNumber));
  }, []);

  const setProduct = useCallback((p: Product) => {
    setProductState(p);
    // Giọng chỉ có nghĩa với FPT AI Engage; đổi sang chat thì phải xoá.
    if (p === "chat") setVoiceIdState(null);
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setSlugState(null);
    setProductState(null);
    setVoiceIdState(null);
    setEvaluated(false);
  }, []);

  return {
    step,
    slug,
    product,
    voiceId,
    evaluated,
    canGoTo,
    goTo,
    next,
    back,
    setSlug: setSlugState,
    setProduct,
    setVoiceId: setVoiceIdState,
    setEvaluated,
    reset,
  };
}
