import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FAQS } from "./faq";
import { StructuredData } from "./structured-data";

function parseGraph(container: HTMLElement) {
  const tag = container.querySelector('script[type="application/ld+json"]');
  expect(tag).not.toBeNull();
  return JSON.parse(tag!.innerHTML.replace(/\\u003c/g, "<")) as {
    "@graph": Array<Record<string, unknown>>;
  };
}

describe("StructuredData", () => {
  it("sinh JSON hợp lệ, đủ bốn schema", () => {
    const { container } = render(<StructuredData />);
    const types = parseGraph(container)["@graph"].map((n) => n["@type"]);
    expect(types).toEqual(["Organization", "WebSite", "SoftwareApplication", "FAQPage"]);
  });

  it("FAQPage khớp CHÍNH XÁC nội dung FAQ đang hiển thị", () => {
    /*
      Khoá lại ràng buộc quan trọng nhất của khối này: schema gửi cho Google phải
      là đúng nội dung người dùng đọc được trên trang. Khai một đằng hiển thị một
      nẻo là cloaking — Google phạt. Vì cả hai cùng đọc từ `FAQS` nên hiện tại
      luôn khớp, và test này chặn việc ai đó tách chúng ra sau này.
    */
    const { container } = render(<StructuredData />);
    const faqNode = parseGraph(container)["@graph"].find((n) => n["@type"] === "FAQPage")!;
    const entities = faqNode.mainEntity as Array<{
      name: string;
      acceptedAnswer: { text: string };
    }>;

    expect(entities).toHaveLength(FAQS.length);
    entities.forEach((e, i) => {
      expect(e.name).toBe(FAQS[i]!.q);
      expect(e.acceptedAnswer.text).toBe(FAQS[i]!.a);
    });
  });

  it("KHÔNG khai aggregateRating — không có review thật nào", () => {
    // Rating bịa là vi phạm chính sách structured data của Google, và cám dỗ
    // thêm vào cho "đẹp SERP" là có thật. Test này nói rõ đó là cố ý.
    const { container } = render(<StructuredData />);
    expect(JSON.stringify(parseGraph(container))).not.toContain("aggregateRating");
  });

  it("escape dấu < để nội dung không đóng sớm thẻ script", () => {
    const { container } = render(<StructuredData />);
    expect(container.querySelector("script")!.innerHTML).not.toContain("</script");
  });
});
