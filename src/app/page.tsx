"use client";

import { useRef } from "react";
import { BackendStatusBanner } from "~/components/studio/backend-status-banner";
import { Faq } from "~/components/landing/faq";
import { Hero } from "~/components/landing/hero";
import { HowItWorks } from "~/components/landing/how-it-works";
import { StructuredData } from "~/components/landing/structured-data";
import { Stepper } from "~/components/studio/stepper";
import { Step1Source, type Step1Handle } from "~/components/studio/step1-source";
import { DEFAULT_FIXTURE_KEY } from "~/lib/fixtures";
import { Step2Product } from "~/components/studio/step2-product";
import { Step3Build } from "~/components/studio/step3-build";
import { Step4Demo } from "~/components/studio/step4-demo";
import { StudioHead } from "~/components/studio/studio-head";
import { useScrollIntoViewOnChange } from "~/hooks/use-scroll-into-view-on-change";
import { useWizard } from "~/hooks/use-wizard";

export default function HomePage() {
  const w = useWizard();
  const step1 = useRef<Step1Handle | null>(null);
  const stepAnchor = useScrollIntoViewOnChange<HTMLDivElement>(w.step);

  return (
    <>
      {/*
        JSON-LD đặt ở TRANG CHỦ chứ không phải root layout: layout bọc mọi route,
        nên `FAQPage` sẽ dính cả vào `/s/[slug]` — trang demo không hề có FAQ nào.
        Khai schema cho nội dung không tồn tại trên trang là lỗi structured data
        Google phạt, nên phạm vi phải đúng bằng phạm vi nội dung thật.

        Trang này là `"use client"` nhưng vẫn được prerender thành HTML tĩnh
        (`○` trong output của `next build`), nên thẻ script này có mặt sẵn trong
        HTML cho crawler — đã kiểm bằng cách grep file build ra.
      */}
      <StructuredData />

      {/*
        CTA "Xem demo mẫu" nạp luôn kịch bản mẫu mặc định. Handle chỉ tồn tại khi
        Bước 1 đang render — optional-chaining ở đây không phải phòng xa suông: sau
        khi người dùng đi tiếp sang Bước 2+, `Step1Source` unmount và handle về
        `null`, lúc đó nút chỉ còn tác dụng nhảy anchor, đúng như mong đợi.
      */}
      <Hero onTryExample={() => step1.current?.pickExample(DEFAULT_FIXTURE_KEY)} />

      {/*
        `scroll-mt-24` bù cho header `sticky` cao 68px: không có nó, cú nhảy tới
        `#studio` đặt mép trên của section ngay dưới đỉnh viewport và header phủ
        mất chính cái tiêu đề "AgentForge Studio" mà người dùng vừa bấm để xem.
      */}
      <section
        id="studio"
        className="mx-auto max-w-[1160px] scroll-mt-24 px-6 pt-11 pb-20 max-[640px]:px-4"
      >
        <StudioHead onReset={w.reset} canReset={w.slug !== null} />

        {/*
          Mỏ neo cuộn khi đổi bước. Mỗi panel bước là một khối dài (danh sách trang
          đã crawl, 20 bài kiểm định…), nên lúc bấm "Tiếp tục" người dùng đang ở tận
          cuối trang; bước mới render Ở TRÊN chỗ đó và trình duyệt giữ nguyên vị trí
          cuộn, nên họ nhìn vào vùng trống hoặc chân trang và tưởng cú bấm không có
          tác dụng.

          Neo vào stepper chứ không phải `#studio`: cuộn tới đây thì thấy ngay "đang ở
          bước mấy" rồi mới tới panel — cuộn lên đầu section thì tiêu đề studio chiếm
          chỗ mà không nói gì mới. `scroll-mt-24` bù cho header `sticky` cao 68px,
          cùng lý do như `scroll-mt-24` của section.
        */}
        <div ref={stepAnchor} className="mb-6 scroll-mt-24">
          <Stepper current={w.step} onSelect={w.goTo} canGoTo={w.canGoTo} />
        </div>

        <BackendStatusBanner />

        {w.step === 1 && (
          <Step1Source
            handleRef={step1}
            onReady={w.setSlug}
            onContinue={() => w.goTo(2)}
          />
        )}

        {w.step === 2 && w.slug && (
          <Step2Product
            slug={w.slug}
            product={w.product}
            onSelectProduct={w.setProduct}
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

      {/*
        Đặt SAU khu studio, không phải trước: wizard mới là chỗ chuyển đổi, và
        chèn thêm nội dung ở giữa hero và nó sẽ đẩy CTA chính xuống dưới màn hình
        đầu tiên. Hai khối này phục vụ người còn phân vân — họ cuộn tiếp — và
        phục vụ SEO (FAQ có JSON-LD tương ứng trong layout).
      */}
      <HowItWorks />
      <Faq />
    </>
  );
}
