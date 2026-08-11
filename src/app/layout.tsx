import "~/styles/globals.css";

import { Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "~/components/ui/sonner";
import { SiteHeader } from "~/components/layout/site-header";
import { SiteFooter } from "~/components/layout/site-footer";

const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "AgentForge — Từ website tới AI Agent đã kiểm định",
  description: "Dựng và kiểm định AI agent FPT.AI từ website doanh nghiệp trong 30 phút.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <TRPCReactProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <Toaster position="top-center" />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
