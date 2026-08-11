"use client";

import { BackendStatusBanner } from "~/components/studio/backend-status-banner";
import { Hero } from "~/components/landing/hero";
import { Stepper } from "~/components/studio/stepper";
import { Step1Source } from "~/components/studio/step1-source";
import { Step2Product } from "~/components/studio/step2-product";
import { Step3Build } from "~/components/studio/step3-build";
import { Step4Demo } from "~/components/studio/step4-demo";
import { StudioHead } from "~/components/studio/studio-head";
import { useWizard } from "~/hooks/use-wizard";

export default function HomePage() {
  const w = useWizard();

  return (
    <>
      <Hero />

      <section id="studio" className="mx-auto max-w-[1160px] px-6 pt-11 pb-20 max-[640px]:px-4">
        <StudioHead onReset={w.reset} canReset={w.slug !== null} />

        <div className="mb-6">
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

        {w.step === 3 && w.slug && (
          <Step3Build
            slug={w.slug}
            onEvaluatedChange={w.setEvaluated}
            onBack={() => w.goTo(2)}
            onContinue={() => w.goTo(4)}
          />
        )}

        {w.step === 4 && w.slug && (
          <Step4Demo slug={w.slug} onBack={() => w.goTo(3)} />
        )}
      </section>
    </>
  );
}
