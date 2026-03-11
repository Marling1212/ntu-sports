"use client";

import { useI18n } from "@/lib/i18n/context";
import MarkdownText from "./MarkdownText";

interface AnnouncementsPageClientProps {
  announcements: any[];
}

export default function AnnouncementsPageClient({ announcements }: AnnouncementsPageClientProps) {
  const { t, locale } = useI18n();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-ntu-green mb-3 sm:mb-4">{t('announcements.pageTitle')}</h1>
        <p className="text-base sm:text-lg text-gray-600">
          {t('announcements.pageDescription')}
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center border border-gray-100">
            <p className="text-base sm:text-lg text-gray-500">{t('announcements.noAnnouncements')}</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white rounded-xl shadow-md p-5 sm:p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-ntu-green">
                  {announcement.title}
                </h2>
                {announcement.is_pinned && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                    {locale === "zh" ? "置頂" : "Pinned"}
                  </span>
                )}
              </div>
              <div className="text-gray-700 mb-4 leading-relaxed text-sm sm:text-base">
                <MarkdownText content={announcement.content} />
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                {t('announcements.posted')}: {new Date(announcement.created_at).toLocaleString(locale === 'zh' ? 'zh-TW' : 'en-US')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

