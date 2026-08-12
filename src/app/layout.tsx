import "~/styles/globals.css";

import { Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";
import { ThemeProvider } from "~/components/layout/theme-provider";
import { SiteHeader } from "~/components/layout/site-header";
import { SiteFooter } from "~/components/layout/site-footer";
import { SITE_NAME, siteUrl } from "~/lib/site";

// `display: "swap"` là mặc định của `next/font`, nhưng khai tường minh để việc
// "không bao giờ FOIT" là một quyết định đọc được, không phải một mặc định mà
// lần nâng cấp sau có thể đổi dưới chân mình.
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const TITLE = "AgentForge — Từ website tới AI Agent đã kiểm định";
// Con số phải khớp hero ("10 phút sau có AI Agent chạy được" + "10 phút" ở
// Stats). Bản cũ ghi "30 phút" ở đây — tức trang chủ tự nói hai con số khác
// nhau, và đây là dòng Google hiển thị trong kết quả tìm kiếm.
const DESCRIPTION =
  "Dán URL website doanh nghiệp, AgentForge tự crawl dữ liệu, dựng AI agent trên FPT AI Chat hoặc FPT AI Engage, tự sinh 20 bài kiểm định và xuất trang demo chia sẻ được — trong 10 phút.";

export const metadata: Metadata = {
  // Thiếu `metadataBase`, mọi URL tương đối trong OG/Twitter/canonical bị Next
  // resolve về `localhost:3000` khi build — card share sẽ trỏ vào máy người build.
  metadataBase: siteUrl,
  title: {
    default: TITLE,
    // Trang con chỉ cần đặt `title: "X"` là ra "X — AgentForge".
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI agent",
    "chatbot tiếng Việt",
    "FPT.AI",
    "FPT AI Chat",
    "FPT AI Engage",
    "AI cho doanh nghiệp",
    "tổng đài AI",
    "AgentForge",
  ],
  authors: [{ name: "FPT Smart Cloud" }],
  creator: "FPT Smart Cloud",
  publisher: "FPT Smart Cloud",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    // `vi_VN` chứ không phải mặc định `en_US`: nội dung toàn bộ là tiếng Việt.
    locale: "vi_VN",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: { icon: "/favicon.ico" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // KHÔNG đặt `maximumScale`/`userScalable: false` — chặn zoom là lỗi
  // accessibility, và Safari iOS bỏ qua nó nên chỉ hại mà không được gì.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    // Khớp `--background` của khối `.dark` trong globals.css. Lệch nhau thì
    // thanh địa chỉ trên mobile là một màu, nền trang ngay dưới nó là màu khác.
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` chỉ cần ở ĐÚNG thẻ <html> này: next-themes chèn
    // class `dark` vào đây bằng script chạy trước khi React hydrate (để tránh
    // nháy trắng), nên class trên server và trên client cố ý khác nhau. Cảnh báo
    // ở đây là dương tính giả, và nó không tắt cảnh báo cho thẻ con nào.
    <html lang="vi" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans">
        {/*
          `defaultTheme="system"` chứ không phải "light": người đã đặt máy ở chế
          độ tối thì thấy đúng thứ họ chọn ngay lần vào đầu tiên. `themeColor` ở
          trên cũng đang khai theo `prefers-color-scheme`, nên hai chỗ nhất quán.
        */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TRPCReactProvider>
            {/*
              Skip-link: người dùng bàn phím/screen reader không phải tab qua toàn
              bộ header trước khi tới nội dung. `sr-only` cho tới khi focus, lúc đó
              `focus:not-sr-only` kéo nó hiện ra như một nút thật.
            */}
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
            >
              Bỏ qua, tới nội dung chính
            </a>
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
            <Toaster position="bottom-center" />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
