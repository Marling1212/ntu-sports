import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";
import { I18nProvider } from "@/lib/i18n/context";
import { LoadingProvider } from "@/components/LoadingProvider";
import PageLoader from "@/components/PageLoader";

export const metadata: Metadata = {
  title: "NTU Sports - 台大運動賽事管理平台",
  description: "台灣大學多運動賽事管理平台，提供即時賽程、戰績、籤表與公告。支援網球、足球、籃球、排球、羽球、桌球、棒球、壘球等多種運動項目。",
  keywords: ["NTU", "台大", "運動", "賽事", "網球", "籃球", "足球", "賽程", "戰績"],
  openGraph: {
    title: "NTU Sports - 台大運動賽事管理平台",
    description: "台灣大學多運動賽事管理平台，提供即時賽程、戰績、籤表與公告",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <I18nProvider>
          <LoadingProvider>
            <Navbar />
            <main className="min-h-screen bg-ntu-gray">
              {children}
            </main>
            <Footer />
            <PageLoader />
            <Analytics />
          </LoadingProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

