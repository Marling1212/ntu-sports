"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function Footer() {
  const { t } = useI18n();
  // Use a static year to avoid hydration mismatches
  // This is safe as the year rarely changes between SSR and hydration
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gradient-to-r from-ntu-green to-green-700 text-white mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-6">
          <div className="animate-fadeIn">
            <h3 className="text-base sm:text-lg font-bold mb-3">{t('footer.about')}</h3>
            <p className="text-xs sm:text-sm text-green-100 leading-relaxed">
              {t('footer.aboutText')}
            </p>
          </div>
          <div className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-base sm:text-lg font-bold mb-3">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/" className="text-green-100 hover:text-white transition-colors inline-flex items-center gap-1">
                  <span>→</span> {t('nav.home')}
                </Link>
              </li>
              <li>
                <span className="text-green-100">{t('footer.sportsSupported')}</span>
              </li>
            </ul>
          </div>
          <div className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-base sm:text-lg font-bold mb-3">{t('footer.features')}</h3>
            <ul className="space-y-1 text-xs sm:text-sm text-green-100">
              <li className="flex items-center gap-2">
                <span>✓</span> <span>{t('footer.feature1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> <span>{t('footer.feature2')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> <span>{t('footer.feature3')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> <span>{t('footer.feature4')}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-green-600 pt-4 sm:pt-6 text-center">
          <p className="text-xs sm:text-sm text-green-100">
            © {currentYear} {t('footer.copyright')}
          </p>
          <p className="text-xs text-green-200 mt-2">
            {t('footer.madeWith')}
          </p>
        </div>
      </div>
    </footer>
  );
}

