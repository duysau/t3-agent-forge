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
          result: { pages: [], kbFacts: ["Fact"], totalChunks: 6, degraded: false, brandName: "X" },
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
          result: { pages: [], kbFacts: [], totalChunks: 6, degraded: false, brandName: "X" },
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

  it("bấm Bắt đầu crawl thì gọi onCrawl", async () => {
    const onCrawl = vi.fn();
    render(<Step1SourceView {...props({ url: "https://senspa.vn", onCrawl })} />);
    await userEvent.click(screen.getByRole("button", { name: /Crawl website/ }));
    expect(onCrawl).toHaveBeenCalledTimes(1);
  });
});
