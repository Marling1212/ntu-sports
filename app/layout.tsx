import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "NTU Sports",
  description: "National Taiwan University Sports Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Navbar />
        <main className="min-h-screen bg-ntu-gray">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

