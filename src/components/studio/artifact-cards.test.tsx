import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtifactCards } from "./artifact-cards";

const PERSONA = {
  name: "Sen",
  role: "Nhân viên tư vấn Sen Spa",
  description: "Nhẹ nhàng, luôn xác nhận nhu cầu trước khi đề xuất gói.",
  avatarLetter: "S",
};

describe("ArtifactCards", () => {
  it("hiện tên, vai và mô tả persona", () => {
    render(<ArtifactCards persona={PERSONA} systemPrompt="prompt" guardrails={["g1"]} />);
    expect(screen.getByText("Sen")).toBeInTheDocument();
    expect(screen.getByText(/Nhân viên tư vấn Sen Spa/)).toBeInTheDocument();
    expect(screen.getByText(/xác nhận nhu cầu/)).toBeInTheDocument();
  });

  it("hiện chữ cái avatar", () => {
    render(<ArtifactCards persona={PERSONA} systemPrompt="prompt" guardrails={["g1"]} />);
    expect(screen.getByTestId("persona-avatar")).toHaveTextContent("S");
  });

  it("liệt kê đủ mọi guardrail", () => {
    render(
      <ArtifactCards
        persona={PERSONA}
        systemPrompt="prompt"
        guardrails={["Không bịa giá", "Không so sánh đối thủ", "Chuyển tiếp khi không biết"]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Không so sánh đối thủ")).toBeInTheDocument();
  });

  it("hiện system prompt nguyên văn, giữ ngắt dòng", () => {
    render(
      <ArtifactCards
        persona={PERSONA}
        systemPrompt={"Dòng một\nDòng hai"}
        guardrails={["g1"]}
      />,
    );
    const pre = screen.getByTestId("system-prompt");
    expect(pre.textContent).toBe("Dòng một\nDòng hai");
  });
});
