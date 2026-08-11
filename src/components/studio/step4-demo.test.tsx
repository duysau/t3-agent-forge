import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DemoPayload } from "~/server/api/routers/demo";
import { Step4Demo } from "./step4-demo";

interface BySlugInput {
  slug: string;
}

const { demoQuery, sendMutation } = vi.hoisted(() => ({
  demoQuery: {
    data: undefined as DemoPayload | undefined,
    isPending: false,
    error: null as { message: string } | null,
  },
  sendMutation: {
    mutateAsync: vi.fn<(input: unknown) => Promise<{ reply: string }>>(),
    isPending: false,
  },
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
  evalSummary: null,
  evalResults: [],
};

function renderStep4() {
  return render(<Step4Demo slug="demo-agent" onBack={vi.fn()} />);
}

describe("Step4Demo", () => {
  beforeEach(() => {
    demoQuery.data = PAYLOAD;
    demoQuery.isPending = false;
    demoQuery.error = null;
    sendMutation.mutateAsync.mockReset();
  });

  it("link chia sẻ là <origin>/s/<slug>", async () => {
    renderStep4();

    const expected = `${window.location.origin}/s/demo-agent`;
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it("sao chép thành công thì đổi nhãn và gọi clipboard với đúng link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderStep4();
    const expected = `${window.location.origin}/s/demo-agent`;
    await screen.findByText(expected);

    await userEvent.click(screen.getByRole("button", { name: /Sao chép/ }));

    expect(await screen.findByText(/Đã sao chép/)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expected);
  });

  it("sao chép bị từ chối thì hiện hướng dẫn chép tay, không báo đã xong", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Không có quyền clipboard"));
    Object.assign(navigator, { clipboard: { writeText } });

    renderStep4();
    const expected = `${window.location.origin}/s/demo-agent`;
    await screen.findByText(expected);

    await userEvent.click(screen.getByRole("button", { name: /Sao chép/ }));

    expect(await screen.findByText(/chép tay|thủ công|tự sao chép/i)).toBeInTheDocument();
    expect(screen.queryByText(/Đã sao chép/)).not.toBeInTheDocument();
  });
});
