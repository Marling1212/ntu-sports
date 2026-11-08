import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";
import { I18nProvider } from "@/lib/i18n/context";
import { LoadingProvider } from "@/components/LoadingProvider";
import PageLoader from "@/components/PageLoader";
import { Toaster } from "react-hot-toast";
import { getLocale } from "@/lib/i18n/server";

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

const themeScript = `
  try {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (_) {}
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const htmlLang = locale === "zh" ? "zh-TW" : "en";
  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased" suppressHydrationWarning>
        <I18nProvider initialLocale={locale}>
          <LoadingProvider>
            <Navbar />
            <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
              {children}
            </main>
            <Footer />
            <PageLoader />
            <Toaster position="top-right" />
            <Analytics />
          </LoadingProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
