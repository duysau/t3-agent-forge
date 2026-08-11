import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandBar } from "./brand-bar";

describe("BrandBar", () => {
  it("hiện tên brand và chữ cái logo", () => {
    render(
      <BrandBar name="Sen Spa" letter="S" emoji={null} color="#203ADC" product="chat" mode="live" degraded={false} />,
    );
    expect(screen.getByText("Sen Spa")).toBeInTheDocument();
    expect(screen.getByTestId("brand-logo")).toHaveTextContent("S");
  });

  it("ưu tiên emoji khi có, thay cho chữ cái", () => {
    render(
      <BrandBar name="Sen Spa" letter="S" emoji="🌸" color="#203ADC" product="chat" mode="live" degraded={false} />,
    );
    expect(screen.getByTestId("brand-logo")).toHaveTextContent("🌸");
  });

  it("áp màu brand qua inline style vì đó là dữ liệu, không phải token", () => {
    render(
      <BrandBar name="Bếp Nhà" letter="B" emoji={null} color="#17B26A" product="voice" mode="live" degraded={false} />,
    );
    expect(screen.getByTestId("brand-bar")).toHaveStyle({ background: "#17B26A" });
  });

  it("ghi đúng sản phẩm đang chạy", () => {
    render(
      <BrandBar name="X" letter="X" emoji={null} color="#203ADC" product="voice" mode="live" degraded={false} />,
    );
    expect(screen.getByText(/FPT AI Engage/)).toBeInTheDocument();
  });

  it("degraded thì hiện badge dữ liệu mẫu, nói rõ là đã thất bại", () => {
    render(
      <BrandBar name="X" letter="X" emoji={null} color="#203ADC" product="chat" mode="live" degraded />,
    );
    expect(screen.getByText(/Dữ liệu mẫu/)).toBeInTheDocument();
    expect(screen.getByText(/không lấy được dữ liệu thật/)).toBeInTheDocument();
  });

  /**
   * Fixture mode được chọn có chủ đích trả `degraded: false` — đúng, vì lệnh gọi
   * fixture *thành công*. Nhưng nó vẫn là dữ liệu mẫu, và nguyên tắc là dữ liệu
   * mẫu luôn được dán nhãn. Nhãn phải nói đúng lý do: một lựa chọn, không phải
   * một thất bại.
   */
  it("mode fixture thì hiện badge dù degraded false, và KHÔNG gọi đó là thất bại", () => {
    render(
      <BrandBar name="Sen Spa" letter="S" emoji="🌸" color="#203ADC" product="chat" mode="fixture" degraded={false} />,
    );
    expect(screen.getByText(/Dữ liệu mẫu/)).toBeInTheDocument();
    expect(screen.getByText(/kịch bản chạy offline/)).toBeInTheDocument();
    expect(screen.queryByText(/không lấy được dữ liệu thật/)).not.toBeInTheDocument();
  });

  it("mode live và không degraded thì không hiện badge", () => {
    render(
      <BrandBar name="X" letter="X" emoji={null} color="#203ADC" product="chat" mode="live" degraded={false} />,
    );
    expect(screen.queryByText(/Dữ liệu mẫu/)).not.toBeInTheDocument();
  });

  it("brand chưa trích được thì vẫn render, không vỡ", () => {
    render(
      <BrandBar name={null} letter={null} emoji={null} color="#203ADC" product={null} mode="live" degraded={false} />,
    );
    expect(screen.getByTestId("brand-bar")).toBeInTheDocument();
  });
});
