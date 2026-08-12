import { ImageResponse } from "next/og";

/*
  Ảnh OG sinh tại build/request time thay vì một file PNG tĩnh — chữ nằm trong
  code nên không bị lệch với nội dung trang khi copy đổi.

  `size` phải là 1200×630: tỉ lệ 1.91:1 mà Facebook/Zalo/LinkedIn/Twitter
  `summary_large_image` đều dùng. Lệch tỉ lệ thì các nền tảng tự crop, thường
  cắt mất chữ.

  KHÔNG dùng Tailwind ở đây — Satori (engine sau `ImageResponse`) chỉ hiểu
  inline style với một tập con của flexbox, không chạy qua PostCSS.
*/
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AgentForge — Từ website tới AI Agent đã kiểm định";

// Route này chỉ phụ thuộc hằng số trong file, không đọc request — cho Next
// prerender thành file tĩnh lúc build thay vì render lại mỗi lượt crawler ghé.
export const dynamic = "force-static";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Gradient nền theo thang FCI (--fci-800 → --fci-500), khớp brand.
          background: "linear-gradient(135deg, #0e1858 0%, #1a2fb0 55%, #203ADC 100%)",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 68,
              height: 68,
              borderRadius: 18,
              background: "#ffffff",
              color: "#203ADC",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#ffffff" }}>AgentForge</div>
            <div style={{ fontSize: 20, color: "#aab9f5" }}>by FPT Smart Cloud</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            Dán website của bạn.
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "#7e95f1",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            10 phút sau có AI Agent.
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 24, color: "#d5dcfa" }}>
          <span>Tự crawl dữ liệu website</span>
          <span>·</span>
          <span>20 bài kiểm định tự động</span>
          <span>·</span>
          <span>Trang demo chia sẻ được</span>
        </div>
      </div>
    ),
    size,
  );
}
