import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BuildTerminal } from "./build-terminal";

describe("BuildTerminal", () => {
  it("in các dòng theo đúng thứ tự truyền vào", () => {
    render(
      <BuildTerminal
        lines={[
          { kind: "info", text: "Đang sinh persona…" },
          { kind: "ok", text: "Persona: Sen" },
        ]}
        busy={null}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual([
      "Đang sinh persona…",
      "Persona: Sen",
    ]);
  });

  it("đang chạy thì hiện nhãn kèm số giây đã trôi", () => {
    render(<BuildTerminal lines={[]} busy={{ label: "Đang chấm điểm", elapsedSeconds: 42 }} />);
    expect(screen.getByText(/Đang chấm điểm/)).toBeInTheDocument();
    expect(screen.getByText(/42 giây/)).toBeInTheDocument();
  });

  it("KHÔNG bao giờ hiện phần trăm — backend không stream tiến độ", () => {
    const { container } = render(
      <BuildTerminal
        lines={[{ kind: "info", text: "Đang sinh 20 test case…" }]}
        busy={{ label: "Đang chấm điểm", elapsedSeconds: 130 }}
      />,
    );
    expect(container.textContent).not.toMatch(/%/);
  });

  it("không có gì thì không render dòng nào", () => {
    render(<BuildTerminal lines={[]} busy={null} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("phân biệt được dòng ok và dòng warn", () => {
    render(
      <BuildTerminal
        lines={[
          { kind: "ok", text: "20/20 bài đã chấm" },
          { kind: "warn", text: "3 bài chưa đạt" },
        ]}
        busy={null}
      />,
    );
    expect(screen.getByText("20/20 bài đã chấm").className).not.toBe(
      screen.getByText("3 bài chưa đạt").className,
    );
  });
});
