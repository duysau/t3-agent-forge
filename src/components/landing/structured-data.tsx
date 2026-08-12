import { SITE_NAME, SITE_URL } from "~/lib/site";
import { FAQS } from "./faq";

/**
 * JSON-LD cho trang chủ. Ba schema tách biệt nhưng gửi trong một mảng `@graph`
 * duy nhất — Google chấp nhận, và một khối thì dễ soát hơn ba khối rải rác.
 *
 * `FAQPage` lấy thẳng từ `FAQS` — cùng mảng mà phần hiển thị dùng. Nếu khai lại
 * nội dung ở đây thì hai bên sẽ lệch nhau ngay lần sửa copy đầu tiên, và nói với
 * Google một đằng hiển thị một nẻo chính là cloaking (Google phạt, không thưởng).
 */
export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "FPT Smart Cloud",
        url: SITE_URL,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "vi-VN",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        inLanguage: "vi-VN",
        publisher: { "@id": `${SITE_URL}/#organization` },
        description:
          "Dựng và kiểm định AI agent FPT.AI từ website doanh nghiệp trong 10 phút, không cần cài đặt.",
        // Bản dùng thử miễn phí là điều landing page đang quảng cáo, nên khai
        // đúng như vậy. KHÔNG khai `aggregateRating`: không có review thật nào,
        // và rating bịa là vi phạm chính sách structured data của Google.
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "VND",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD phải vào DOM nguyên văn. `JSON.stringify` không escape `<`, nên
      // chặn chuỗi `</script>` bằng cách thoát dấu `<` — nếu không, một nội dung
      // FAQ chứa thẻ HTML có thể đóng sớm thẻ script này và chèn markup lạ.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
      }}
    />
  );
}
