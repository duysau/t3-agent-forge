import { render, screen } from "@testing-library/react";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoPayload } from "~/server/api/routers/demo";

const { demoBySlug, sendMutation, notFound } = vi.hoisted(() => ({
  demoBySlug: vi.fn<(input: { slug: string }) => Promise<DemoPayload>>(),
  sendMutation: {
    mutateAsync: vi.fn<(input: unknown) => Promise<{ reply: string }>>(),
    isPending: false,
  },
  // Next.js thật: `notFound()` ném lỗi để dừng render ngay tại chỗ gọi — mô
  // phỏng lại điều đó ở đây để hành vi "gọi rồi dừng" giống thật, chứ không
  // chỉ là một no-op mà code phía sau vẫn chạy tiếp.
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("~/trpc/server", () => ({
  api: {
    demo: {
      bySlug: demoBySlug,
    },
  },
}));

vi.mock("~/trpc/react", () => ({
  api: {
    chat: {
      send: { useMutation: () => sendMutation },
    },
  },
}));

vi.mock("next/navigation", () => ({ notFound }));

// Import sau khi mock đã đăng ký — page.tsx import "~/trpc/server" (module thật
// có `import "server-only"`, sẽ ném lỗi ngoài server component) và "~/trpc/react".
import DemoPage from "./page";

const EVAL_SUMMARY: DemoPayload["evalSummary"] = {
  passRate: 90,
  avgScore: 4.5,
  passed: 18,
  total: 20,
  breakdown: {
    grounded: { pass: 8, total: 8 },
    trap: { pass: 6, total: 8 },
    edge: { pass: 4, total: 4 },
  },
};

const PAYLOAD: DemoPayload = {
  slug: "demo-agent",
  status: "evaluated",
  product: "chat",
  voiceId: null,
  degraded: false,
  brandName: "Suối Khoáng Nóng",
  brandColor: "#0ea5e9",
  brandLogoLetter: "S",
  brandLogoEmoji: null,
  industry: "spa",
  persona: null,
  guardrails: [],
  kbFacts: ["Giá vé 200k", "Mở 8h-22h", "Có bãi đỗ xe"],
  chunkCount: 3,
  evalSummary: EVAL_SUMMARY,
  evalResults: [],
};

function loadPage(slug = "demo-agent") {
  return DemoPage({ params: Promise.resolve({ slug }) });
}

describe("DemoPage", () => {
  beforeEach(() => {
    demoBySlug.mockReset();
    sendMutation.mutateAsync.mockReset();
    notFound.mockClear();
  });

  it("payload hợp lệ thì hiện brand, ô chat và bảng điểm", async () => {
    demoBySlug.mockResolvedValueOnce(PAYLOAD);

    render(await loadPage());

    expect(screen.getByText("Suối Khoáng Nóng")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nhập câu hỏi/)).toBeInTheDocument();
    expect(screen.getByText("Kết quả kiểm định")).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("evalSummary null thì ẩn bảng điểm (agent vừa dựng lại, chưa có eval mới)", async () => {
    demoBySlug.mockResolvedValueOnce({ ...PAYLOAD, evalSummary: null });

    render(await loadPage());

    expect(screen.getByText("Suối Khoáng Nóng")).toBeInTheDocument();
    expect(screen.queryByText("Kết quả kiểm định")).not.toBeInTheDocument();
  });

  /**
   * `demo.ts` cố tình phục vụ agent chưa dựng và mang theo `status` chính vì lúc
   * này. Chia sẻ link ngay sau Bước 1 mà hiện ô chat là gắn một ô chat vào agent
   * có system prompt rỗng — hứa một thứ chưa tồn tại.
   */
  it("agent chưa dựng thì hiện trạng thái thật, KHÔNG hiện ô chat", async () => {
    demoBySlug.mockResolvedValueOnce({
      ...PAYLOAD,
      status: "draft",
      evalSummary: null,
      evalResults: [],
    });

    render(await loadPage());

    expect(screen.getByTestId("not-built-notice")).toBeInTheDocument();
    expect(screen.getByText(/chưa dựng xong/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Nhập câu hỏi/)).not.toBeInTheDocument();
    // Brand bar vẫn hiện: trang mở được là điểm mạnh, chỉ ô chat mới là lời hứa sai.
    expect(screen.getByText("Suối Khoáng Nóng")).toBeInTheDocument();
  });

  it("agent đã dựng nhưng chưa kiểm định thì vẫn có ô chat", async () => {
    demoBySlug.mockResolvedValueOnce({ ...PAYLOAD, status: "built", evalSummary: null });

    render(await loadPage());

    expect(screen.getByPlaceholderText(/Nhập câu hỏi/)).toBeInTheDocument();
    expect(screen.queryByTestId("not-built-notice")).not.toBeInTheDocument();
  });

  it("TRPCError NOT_FOUND thì gọi notFound(), không tự vẽ trang", async () => {
    demoBySlug.mockRejectedValueOnce(
      new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy agent" }),
    );

    await expect(loadPage("khongcogi12")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("lỗi chung (Postgres không kết nối được) thì KHÔNG gọi notFound(), hiện thông báo trung thực", async () => {
    demoBySlug.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    render(await loadPage());

    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByText(/không tải được trang demo/i)).toBeInTheDocument();
    expect(screen.getByText(/hệ thống đang gặp sự cố/i)).toBeInTheDocument();
    // Không được lẫn sang thông báo "không tìm thấy" của not-found.tsx — đó là
    // lỗi hạ tầng, không phải link sai.
    expect(screen.queryByText(/link có thể đã bị xoá/i)).not.toBeInTheDocument();
  });
});
