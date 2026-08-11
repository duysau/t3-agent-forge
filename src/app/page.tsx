"use client";

import { BackendStatusBanner } from "~/components/studio/backend-status-banner";
import { Stepper } from "~/components/studio/stepper";
import { Step1Source } from "~/components/studio/step1-source";
import { Step2Product } from "~/components/studio/step2-product";
import { useWizard } from "~/hooks/use-wizard";

export default function HomePage() {
  const w = useWizard();

  return (
    <div className="mx-auto max-w-[1160px] px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">AgentForge Studio</h1>
        <p className="mt-2 text-[17px] text-gray-500">
          Bốn bước từ website tới AI Agent đã kiểm định.
        </p>
      </header>

      <div className="mb-8">
        <Stepper current={w.step} onSelect={w.goTo} canGoTo={w.canGoTo} />
      </div>

      <BackendStatusBanner />

      {w.step === 1 && (
        <Step1Source onReady={w.setSlug} onContinue={() => w.goTo(2)} />
      )}

      {w.step === 2 && w.slug && (
        <Step2Product
          slug={w.slug}
          product={w.product}
          voiceId={w.voiceId}
          onSelectProduct={w.setProduct}
          onVoiceChange={w.setVoiceId}
          onBack={() => w.goTo(1)}
          onSaved={() => w.goTo(3)}
        />
      )}

      {w.step >= 3 && (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          Bước {w.step} thuộc Plan 2 — chưa triển khai.
        </p>
      )}
    </div>
  );
}
