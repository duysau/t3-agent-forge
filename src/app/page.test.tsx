import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

vi.mock("~/trpc/react", () => ({
  api: {
    source: {
      crawl: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      health: { useQuery: () => ({ data: undefined, isPending: false, error: null }) },
    },
    // Bước 2 render `Step2Product`, nó đọc mutation này ngay lúc mount.
    agent: {
      setProduct: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

/**
 * Wizard bị thay bằng một stub GHI ĐƯỢC để test lái được bước hiện tại.
 *
 * Đi qua giao diện thay vì stub thì phải crawl thật rồi mới bấm "Tiếp tục" được (nút
 * bị khoá khi chưa có kết quả), tức test chuyển-bước sẽ phải dựng cả một lượt crawl
 * giả — nhiều dây nối hơn chính thứ đang cần kiểm. `STEPS` giữ nguyên bản thật vì
 * `Stepper` đọc nó để vẽ bốn bước.
 */
const wizard = vi.hoisted(() => ({
  step: 1 as 1 | 2 | 3 | 4,
  slug: "demo-agent12" as string | null,
  product: null as "chat" | "voice" | null,
  evaluated: false,
  canGoTo: () => true,
  goTo: vi.fn(),
  next: vi.fn(),
  back: vi.fn(),
  setSlug: vi.fn(),
  setProduct: vi.fn(),
  setEvaluated: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("~/hooks/use-wizard", async () => {
  const actual = await vi.importActual<typeof import("~/hooks/use-wizard")>("~/hooks/use-wizard");
  return { ...actual, useWizard: () => wizard };
});

beforeEach(() => {
  wizard.step = 1;
  wizard.slug = "demo-agent12";
  wizard.product = null;
  wizard.evaluated = false;
});

describe("HomePage", () => {
  it("hiện landing trước wizard", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Dán website của bạn/);
  });

  it("khu studio có anchor để CTA nhảy tới", () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector("#studio")).not.toBeNull();
  });

  it("mở ra là đang ở Bước 1", () => {
    // "AgentForge Studio" comes from StudioHead, which renders on EVERY step,
    // so asserting on it cannot distinguish step 1 from any other step — it
    // passes even if the wizard opened on step 2, 3 or 4. Step 1's own panel
    // title ("Gắn nguồn dữ liệu") only renders while step 1 is active.
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /Gắn nguồn dữ liệu/ })).toBeInTheDocument();
  });
});

/**
 * Chuyển bước phải kéo màn hình về khu wizard.
 *
 * Mỗi panel bước là một khối dài, nên lúc bấm "Tiếp tục" người dùng đang ở tận cuối
 * trang; bước mới render Ở TRÊN chỗ đó mà trình duyệt giữ nguyên vị trí cuộn — họ
 * nhìn vào vùng trống và tưởng cú bấm không có tác dụng.
 *
 * Test ở tầng trang (không chỉ tầng hook) vì bug thật là "hook không được nối":
 * `useScrollIntoViewOnChange` có test riêng cho phần logic, còn đây kiểm cái ref có
 * thật sự gắn vào mỏ neo và có nhận `w.step` hay không.
 */
describe("HomePage cuộn khi đổi bước", () => {
  it("đổi bước thì kéo mỏ neo wizard vào tầm nhìn", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    wizard.step = 1;
    const { rerender } = render(<HomePage />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    wizard.step = 2;
    rerender(<HomePage />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("mỏ neo chừa chỗ cho header sticky để tiêu đề không bị phủ", () => {
    wizard.step = 1;
    const { container } = render(<HomePage />);

    // `scroll-mt-24` bù đúng header cao 68px; thiếu nó thì cuộn tới xong header
    // che mất chính cái stepper vừa cuộn tới.
    expect(container.querySelector(".scroll-mt-24")).not.toBeNull();
  });
});
