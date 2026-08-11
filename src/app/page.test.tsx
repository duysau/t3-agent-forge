import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";

vi.mock("~/trpc/react", () => ({
  api: {
    source: {
      crawl: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      health: { useQuery: () => ({ data: undefined, isPending: false, error: null }) },
    },
  },
}));

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
