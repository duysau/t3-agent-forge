import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Step1SourceView, type Step1ViewProps } from "./step1-source-view";

function props(over: Partial<Step1ViewProps> = {}): Step1ViewProps {
  return {
    url: "",
    onUrlChange: vi.fn(),
    onCrawl: vi.fn(),
    onPickExample: vi.fn(),
    crawling: false,
    elapsedSeconds: 0,
    result: null,
    error: null,
    pdf: null,
    pdfError: null,
    uploading: false,
    onPickPdf: vi.fn(),
    onContinue: vi.fn(),
    ...over,
  };
}

describe("Step1SourceView", () => {
  it("nút Tiếp tục bị vô hiệu khi chưa crawl", () => {
    render(<Step1SourceView {...props()} />);
    expect(screen.getByRole("button", { name: /Tiếp tục/ })).toBeDisabled();
  });

  it("crawl xong thì mở nút Tiếp tục", () => {
    render(
      <Step1SourceView
        {...props({
          result: {
            pages: [{ url: "https://senspa.vn", title: "Sen Spa", status: "ok" }],
            kbFacts: ["Massage 60 phút: 350.000đ"],
            factsSource: "llm",
            totalChunks: 12,
            degraded: false,
            brandName: "Sen Spa",
          },
        })}
      />,
    );
    expect(screen.getByRole("button", { name: /Tiếp tục/ })).toBeEnabled();
  });

  it("đang crawl thì hiện số giây đã trôi, KHÔNG hiện phần trăm giả", () => {
    render(<Step1SourceView {...props({ crawling: true, elapsedSeconds: 12 })} />);
    expect(screen.getByText(/12 giây/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("hiện danh sách trang và số facts sau khi crawl", () => {
    render(
      <Step1SourceView
        {...props({
          result: {
            pages: [
              { url: "https://senspa.vn", title: "Sen Spa", status: "ok" },
              { url: "https://senspa.vn/bang-gia", title: "Bảng giá", status: "ok" },
            ],
            kbFacts: ["Fact A", "Fact B"],
            factsSource: "llm",
            totalChunks: 12,
            degraded: false,
            brandName: "Sen Spa",
          },
        })}
      />,
    );
    expect(screen.getByText("Bảng giá")).toBeInTheDocument();
    expect(screen.getByText("Fact A")).toBeInTheDocument();
    expect(screen.getByText(/2 facts/)).toBeInTheDocument();
  });

  it("hiện badge dữ liệu mẫu khi bị tụt hạng", () => {
    render(
      <Step1SourceView
        {...props({
          result: {
            pages: [],
            kbFacts: ["Fact"],
            factsSource: "llm",
            totalChunks: 6,
            degraded: true,
            brandName: "Sen Spa",
          },
        })}
      />,
    );
    expect(screen.getByText(/Dữ liệu mẫu/)).toBeInTheDocument();
  });

  it("không hiện badge dữ liệu mẫu khi chạy live", () => {
    render(
      <Step1SourceView
        {...props({
          result: { pages: [], kbFacts: ["Fact"], factsSource: "llm", totalChunks: 6, degraded: false, brandName: "X" },
        })}
      />,
    );
    expect(screen.queryByText(/Dữ liệu mẫu/)).not.toBeInTheDocument();
  });

  it("hiện lỗi crawl kèm nguyên nhân từ backend", () => {
    render(<Step1SourceView {...props({ error: "Không crawl được: Cloudflare chặn" })} />);
    expect(screen.getByText(/Cloudflare chặn/)).toBeInTheDocument();
  });

  it("bấm chip kịch bản mẫu thì gọi onPickExample với khoá fixture", async () => {
    const onPickExample = vi.fn();
    render(<Step1SourceView {...props({ onPickExample })} />);
    await userEvent.click(screen.getByRole("button", { name: /Sen Spa/ }));
    expect(onPickExample).toHaveBeenCalledWith("senspa");
  });

  it("lỗi PDF hiện riêng và KHÔNG xoá kết quả crawl đã có", () => {
    render(
      <Step1SourceView
        {...props({
          result: {
            pages: [],
            kbFacts: ["Fact còn đây"],
            factsSource: "llm",
            totalChunks: 6,
            degraded: false,
            brandName: "X",
          },
          pdfError: "PDF không có text",
        })}
      />,
    );
    expect(screen.getByText(/PDF không có text/)).toBeInTheDocument();
    expect(screen.getByText("Fact còn đây")).toBeInTheDocument();
  });

  it("upload PDF xong thì hiện tên file và số chunk", () => {
    render(
      <Step1SourceView
        {...props({
          result: { pages: [], kbFacts: [], factsSource: "llm", totalChunks: 6, degraded: false, brandName: "X" },
          pdf: { fileName: "bang-gia.pdf", chunks: 4, pages: 2 },
        })}
      />,
    );
    expect(screen.getByText(/bang-gia\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/4 chunk/)).toBeInTheDocument();
  });

  it("chưa crawl thì không cho upload PDF — backend cần session trước", () => {
    render(<Step1SourceView {...props()} />);
    expect(screen.getByTestId("pdf-input")).toBeDisabled();
  });

  it("crawl xong rồi thì cho phép upload PDF", () => {
    render(
      <Step1SourceView
        {...props({
          result: { pages: [], kbFacts: [], factsSource: "llm", totalChunks: 6, degraded: false, brandName: "X" },
        })}
      />,
    );
    expect(screen.getByTestId("pdf-input")).toBeEnabled();
  });

  it("bấm Bắt đầu crawl thì gọi onCrawl", async () => {
    const onCrawl = vi.fn();
    render(<Step1SourceView {...props({ url: "https://senspa.vn", onCrawl })} />);
    await userEvent.click(screen.getByRole("button", { name: "Crawl website" }));
    expect(onCrawl).toHaveBeenCalledTimes(1);
  });

  it("khối kb-preview hiện đủ số fact truyền vào, không thiếu không thừa", () => {
    render(
      <Step1SourceView
        {...props({
          result: {
            pages: [],
            kbFacts: ["Fact A", "Fact B", "Fact C"],
            factsSource: "llm",
            totalChunks: 6,
            degraded: false,
            brandName: "X",
          },
        })}
      />,
    );
    const facts = ["Fact A", "Fact B", "Fact C"];
    for (const f of facts) {
      expect(screen.getByText(f)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/^Fact [A-C]$/)).toHaveLength(facts.length);
  });

  it("danh sách trang crawl hiện đúng icon theo status — ok dùng Check, khác dùng Minus", () => {
    const { container } = render(
      <Step1SourceView
        {...props({
          result: {
            pages: [
              { url: "https://senspa.vn", title: "Trang chủ", status: "ok" },
              { url: "https://senspa.vn/loi", title: "Trang lỗi", status: "error" },
            ],
            kbFacts: [],
            factsSource: "llm",
            totalChunks: 6,
            degraded: false,
            brandName: "X",
          },
        })}
      />,
    );
    const rows = screen.getAllByText(/Trang (chủ|lỗi)/).map((el) => el.closest("li")!);
    expect(rows).toHaveLength(2);
    const [okRow, errorRow] = rows;
    // lucide-react renders each icon as an <svg class="lucide lucide-<name>">.
    expect(okRow!.querySelector("svg.lucide-check")).toBeTruthy();
    expect(okRow!.querySelector("svg.lucide-minus")).toBeFalsy();
    expect(errorRow!.querySelector("svg.lucide-minus")).toBeTruthy();
    expect(errorRow!.querySelector("svg.lucide-check")).toBeFalsy();
    // sanity: the two rows really differ in child structure, not just by coincidence.
    expect(container.querySelectorAll("svg.lucide-check").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("svg.lucide-minus").length).toBeGreaterThan(0);
  });

  /**
   * Đo được trong jsdom là kết quả twMerge, không phải chiều cao render (không có
   * stylesheet nào được áp). Nhưng đó đúng là chỗ đã hỏng: `h-9` (36px) và
   * `md:text-sm` của base shadcn khác nhóm utility với `py-3`/`text-[15px]` nên
   * sống sót và đè lên giá trị prototype.
   */
  it("class của base shadcn không còn đè lên ô nhập URL", () => {
    render(<Step1SourceView {...props()} />);
    const classes = screen.getByPlaceholderText("https://senspa.vn").className.split(/\s+/);

    for (const dead of [
      "h-9",
      "md:text-sm",
      "focus-visible:border-ring",
      "focus-visible:ring-3",
      "focus-visible:ring-ring/50",
    ]) {
      expect(classes).not.toContain(dead);
    }
    for (const want of ["h-auto", "py-3", "text-[15px]", "md:text-[15px]"]) {
      expect(classes).toContain(want);
    }
  });
  const RESULT_BASE = {
    pages: [],
    kbFacts: ['Fact A', 'Fact B'],
    factsSource: "llm",
    totalChunks: 4,
    degraded: false,
    brandName: 'X',
  };

  it('facts_source heuristic thì cảnh báo chất lượng facts kém', () => {
    render(<Step1SourceView {...props({ result: { ...RESULT_BASE, factsSource: 'heuristic' } })} />);
    const warn = screen.getByTestId('facts-heuristic-warning');
    expect(warn).toBeInTheDocument();
    expect(warn).toHaveTextContent(/dự phòng/);
    expect(warn).toHaveTextContent(/Bước 3/);
  });

  it('facts_source llm thì KHÔNG cảnh báo gì', () => {
    render(<Step1SourceView {...props({ result: { ...RESULT_BASE, factsSource: 'llm' } })} />);
    expect(screen.queryByTestId('facts-heuristic-warning')).not.toBeInTheDocument();
  });

  it('backend không trả facts_source thì im lặng, không đoán là kém', () => {
    render(<Step1SourceView {...props({ result: { ...RESULT_BASE, factsSource: null } })} />);
    expect(screen.queryByTestId('facts-heuristic-warning')).not.toBeInTheDocument();
  });

  it('giá trị facts_source lạ cũng im lặng — tín hiệu tư vấn, không báo động sai', () => {
    render(<Step1SourceView {...props({ result: { ...RESULT_BASE, factsSource: 'cached' } })} />);
    expect(screen.queryByTestId('facts-heuristic-warning')).not.toBeInTheDocument();
  });
});

/**
 * Crawl là bước chờ lâu nhất mà người dùng phải nhìn: tới 20 trang, thường 1–3
 * phút, và client tự dừng ở 300 giây (`TIMEOUTS.crawl`). Khối chờ vì thế phải làm
 * ba việc — nói nó đang chạy, nói còn phải chờ bao lâu nữa là bình thường, và
 * KHÔNG bịa ra một tỷ lệ phần trăm nào.
 */
describe("Step1SourceView trong lúc chờ crawl", () => {
  it("thanh tiến độ là indeterminate — không có aria-valuenow để bịa tiến độ", () => {
    render(<Step1SourceView {...props({ crawling: true, elapsedSeconds: 3 })} />);

    const bar = screen.getByRole("progressbar");
    // Theo ARIA, progressbar KHÔNG có `aria-valuenow` nghĩa là "không biết tiến độ".
    // Backend không stream gì, nên đây là sự thật duy nhất nói được.
    expect(bar).not.toHaveAttribute("aria-valuenow");
  });

  it("khối chờ là live region để screen reader biết đang có việc chạy", () => {
    render(<Step1SourceView {...props({ crawling: true, elapsedSeconds: 3 })} />);

    expect(screen.getByRole("status")).toHaveTextContent(/đang crawl/i);
  });

  it("mới bắt đầu thì nói trước khoảng thời gian phải chờ", () => {
    render(<Step1SourceView {...props({ crawling: true, elapsedSeconds: 3 })} />);

    expect(screen.getByRole("status")).toHaveTextContent(/phút/i);
  });

  /**
   * Sau ~1 phút, một thanh chạy không kèm lời nào trông y như treo. Người dùng sẽ
   * bấm lại hoặc rời trang — cả hai đều mất lượt crawl đang chạy dở.
   */
  it("chờ lâu thì trấn an rằng site nhiều trang mất thời gian hơn", () => {
    render(<Step1SourceView {...props({ crawling: true, elapsedSeconds: 70 })} />);

    expect(screen.getByRole("status")).toHaveTextContent(/nhiều trang|vẫn đang/i);
  });

  it("chờ rất lâu thì nói rõ mốc tự dừng, không để người dùng chờ vô hạn", () => {
    render(<Step1SourceView {...props({ crawling: true, elapsedSeconds: 200 })} />);

    expect(screen.getByRole("status")).toHaveTextContent(/5 phút|dừng/i);
  });

  it("crawl xong thì khối chờ biến mất", () => {
    render(<Step1SourceView {...props({ crawling: false, elapsedSeconds: 200 })} />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

/**
 * Nút Crawl và ô nhập URL nằm cạnh nhau trong một hàng flex, nên hai chiều cao lệch
 * nhau là thấy ngay: `size: default` của `Button` (shadcn) ghim `h-9` = 36px, còn ô
 * nhập cao ~47px vì chiều cao của nó do padding sinh ra (`py-3` + `text-[15px]`,
 * xem chú thích dài trong component). Ghim một con số cho nút là hỏng lại ngay lần
 * ai đó đổi padding ô nhập — nên nút phải CO THEO hàng, không mang chiều cao riêng.
 */
describe("Step1SourceView bố cục hàng URL", () => {
  it("nút Crawl cao theo hàng, không giữ h-9 của Button", () => {
    render(<Step1SourceView {...props({ url: "https://senspa.vn" })} />);

    // Tên khớp CHÍNH XÁC: ô chọn PDF cũng là một `button` và nhãn của nó chứa
    // "Crawl website trước đã", nên một regex /Crawl website/ khớp cả hai.
    const button = screen.getByRole("button", { name: "Crawl website" });
    expect(button.className).not.toMatch(/(?:^|\s)h-9(?:\s|$)/);
    expect(button.className).toMatch(/self-stretch/);
  });
});
