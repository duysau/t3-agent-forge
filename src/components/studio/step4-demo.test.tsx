import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoPayload } from "~/server/api/routers/demo";
import { Step4Demo } from "./step4-demo";

interface BySlugInput {
  slug: string;
}

const { demoQuery, sendMutation, toQrDataUrl, notifyOk } = vi.hoisted(() => ({
  demoQuery: {
    data: undefined as DemoPayload | undefined,
    isPending: false,
    error: null as { message: string } | null,
  },
  sendMutation: {
    mutateAsync: vi.fn<(input: unknown) => Promise<{ reply: string }>>(),
    isPending: false,
  },
  toQrDataUrl: vi.fn<(text: string) => Promise<string>>(),
  notifyOk: vi.fn<(message: string) => void>(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    demo: {
      bySlug: { useQuery: (_input: BySlugInput) => demoQuery },
    },
    chat: {
      send: { useMutation: () => sendMutation },
    },
  },
}));

vi.mock("~/lib/qr", () => ({
  toQrDataUrl,
}));

vi.mock("~/lib/notify", () => ({
  notifyOk,
}));

const PAYLOAD: DemoPayload = {
  slug: "demo-agent",
  status: "evaluated",
  product: "chat",
  voiceId: null,
  mode: "live",
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
  evalSummary: null,
  evalResults: [],
};

function renderStep4() {
  return render(<Step4Demo slug="demo-agent" onBack={vi.fn()} />);
}

// Một chỗ duy nhất định nghĩa link kỳ vọng — mọi test dùng lại giá trị này để
// so sánh với link hiển thị, link chép vào clipboard, VÀ link mã hoá vào QR.
// Nếu viết literal này ba lần trong ba assertion khác nhau, chính test cũng có
// thể trôi giống hệt cách component có thể trôi (hiển thị một link, chép một
// link khác, mã hoá một link khác nữa) mà không ai phát hiện ra.
function expectedShareUrl() {
  return `${window.location.origin}/s/demo-agent`;
}

describe("Step4Demo", () => {
  beforeEach(() => {
    demoQuery.data = PAYLOAD;
    demoQuery.isPending = false;
    demoQuery.error = null;
    sendMutation.mutateAsync.mockReset();
    toQrDataUrl.mockReset();
    toQrDataUrl.mockResolvedValue("data:image/png;base64,AAA");
    notifyOk.mockReset();
  });

  it("link chia sẻ là <origin>/s/<slug>", async () => {
    renderStep4();

    expect(await screen.findByText(expectedShareUrl())).toBeInTheDocument();
  });

  it("sao chép thành công thì đổi nhãn và gọi clipboard với đúng link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderStep4();
    await screen.findByText(expectedShareUrl());

    await userEvent.click(screen.getByRole("button", { name: /sao chép/i }));

    expect(await screen.findByText(/Đã sao chép/)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expectedShareUrl());
  });

  it("sao chép bị từ chối thì hiện hướng dẫn chép tay, không báo đã xong", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Không có quyền clipboard"));
    Object.assign(navigator, { clipboard: { writeText } });

    renderStep4();
    await screen.findByText(expectedShareUrl());

    await userEvent.click(screen.getByRole("button", { name: /sao chép/i }));

    expect(await screen.findByText(/chép tay|thủ công|tự sao chép/i)).toBeInTheDocument();
    expect(screen.queryByText(/Đã sao chép/)).not.toBeInTheDocument();
  });

  it("sao chép thất bại ngay sau một lần thành công thì không còn giữ nhãn đã sao chép cũ", async () => {
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Không có quyền clipboard"));
    Object.assign(navigator, { clipboard: { writeText } });

    renderStep4();
    await screen.findByText(expectedShareUrl());

    // Lượt 1: thành công — nhãn đổi thành "Đã sao chép".
    await userEvent.click(screen.getByRole("button", { name: /sao chép/i }));
    expect(await screen.findByText(/Đã sao chép/)).toBeInTheDocument();

    // Lượt 2, trong lúc nhãn cũ còn hiện: thất bại. Nút giờ mang nhãn
    // "Đã sao chép" nên vẫn khớp /sao chép/i — bấm lại đúng nút đó.
    await userEvent.click(screen.getByRole("button", { name: /sao chép/i }));

    expect(await screen.findByText(/chép tay|thủ công|tự sao chép/i)).toBeInTheDocument();
    expect(screen.queryByText(/Đã sao chép/)).not.toBeInTheDocument();
  });

  /**
   * `toQrDataUrl` throw có chủ đích. Không có `.catch`, người dùng bấm "Mã QR" và
   * nhận về một nút chết cộng một unhandled rejection — cùng hư hỏng thầm lặng mà
   * đường lỗi clipboard ngay bên cạnh đã được vá.
   */
  it("sinh mã QR lỗi thì hiện thông báo, không im lặng", async () => {
    toQrDataUrl.mockRejectedValue(new Error("Không sinh được mã QR từ chuỗi rỗng"));

    renderStep4();
    await screen.findByText(expectedShareUrl());

    await userEvent.click(screen.getByRole("button", { name: /Mã QR/ }));

    expect(await screen.findByText(/Không sinh được mã QR/)).toBeInTheDocument();
    expect(screen.queryByAltText(/Mã QR của link demo/)).not.toBeInTheDocument();
  });

  it("agent chưa dựng thì hiện trạng thái thật thay vì ô chat, link vẫn chia sẻ được", async () => {
    demoQuery.data = { ...PAYLOAD, status: "draft" };

    renderStep4();

    expect(await screen.findByTestId("not-built-notice")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Nhập câu hỏi/)).not.toBeInTheDocument();
    expect(screen.getByText(expectedShareUrl())).toBeInTheDocument();
  });

  it("mã QR mã hoá đúng cùng một link đang hiển thị và được sao chép", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderStep4();
    await screen.findByText(expectedShareUrl());

    await userEvent.click(screen.getByRole("button", { name: /sao chép/i }));
    await screen.findByText(/Đã sao chép/);
    expect(writeText).toHaveBeenCalledWith(expectedShareUrl());

    await userEvent.click(screen.getByRole("button", { name: /Mã QR/ }));

    expect(toQrDataUrl).toHaveBeenCalledWith(expectedShareUrl());
  });

  it("sinh mã QR xong thì báo toast", async () => {
    renderStep4();
    await screen.findByText(expectedShareUrl());

    await userEvent.click(screen.getByRole("button", { name: /Mã QR/ }));

    await waitFor(() =>
      expect(notifyOk).toHaveBeenCalledWith("Đã sinh mã QR — chiếu lên là quét được"),
    );
  });
});
