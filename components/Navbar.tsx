"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ShareButton from "./ShareButton";
import QRCodeShare from "./QRCodeShare";

export default function Navbar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <nav className="bg-ntu-green text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold hover:opacity-80 transition-opacity">
            🏆 NTU Sports
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              首頁
            </Link>
            {!isHomePage && (
              <>
                <ShareButton className="hidden sm:block" />
                <QRCodeShare className="hidden sm:block" />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

