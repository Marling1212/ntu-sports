"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ShareButton from "./ShareButton";
import QRCodeShare from "./QRCodeShare";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/lib/i18n/context";

export default function Navbar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();

  return (
    <nav className="bg-gradient-to-r from-ntu-green to-green-700 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 sm:py-4">
          <Link 
            href="/" 
            className="text-xl sm:text-2xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span className="text-2xl sm:text-3xl">🏆</span>
            <span className="hidden sm:inline">NTU Sports</span>
            <span className="sm:hidden">NTU</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://rent.pe.ntu.edu.tw/member/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors font-medium min-h-[44px] flex items-center"
            >
              Rent PE
            </a>
            <a
              href="https://matchup-platform.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors font-medium min-h-[44px] flex items-center"
            >
              matchup
            </a>
            <LanguageSwitcher />
            <Link 
              href="/" 
              className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors font-medium min-h-[44px] flex items-center"
            >
              {t('nav.home')}
            </Link>
            {!isHomePage && (
              <>
                <ShareButton />
                <QRCodeShare />
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="選單"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 animate-slideIn border-t border-white/20 mt-2 pt-4">
            <div className="flex flex-col gap-3">
              <a
                href="https://rent.pe.ntu.edu.tw/member/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-lg hover:bg-white/10 transition-colors font-medium min-h-[44px] flex items-center"
              >
                Rent PE
              </a>
              <a
                href="https://matchup-platform.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-lg hover:bg-white/10 transition-colors font-medium min-h-[44px] flex items-center"
              >
                matchup
              </a>
              <div className="px-4">
                <LanguageSwitcher />
              </div>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-lg hover:bg-white/10 transition-colors font-medium min-h-[44px] flex items-center"
              >
                {t('nav.home')}
              </Link>
              {!isHomePage && (
                <div className="flex flex-col gap-3 px-4">
                  <div className="flex gap-2">
                    <ShareButton className="flex-1" />
                    <QRCodeShare className="flex-1" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

