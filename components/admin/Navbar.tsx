"use client";

import Link from "next/link";
import { Suspense, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import DivisionSwitcher from "./DivisionSwitcher";
import EventVisibilityToggle from "./EventVisibilityToggle";
import { useI18n } from "@/lib/i18n/context";

interface Division {
  id: string;
  sport: string;
  name?: string | null;
  tournament_type?: string;
  display_order?: number;
}

interface AdminNavbarProps {
  eventId?: string;
  eventName?: string;
  /** Event sport (e.g. "tennis", "soccer") for consistent "View site" link to /sports/{sport}/events/{eventId} */
  sport?: string;
  /** When event has multiple divisions, show switcher and preserve divisionId in links */
  divisions?: Division[];
  currentDivisionId?: string | null;
  isVisible?: boolean;
}

export default function AdminNavbar({
  eventId,
  eventName,
  sport,
  divisions = [],
  currentDivisionId = null,
  isVisible,
}: AdminNavbarProps) {
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const divisionIdFromUrl = searchParams?.get("divisionId");
  const effectiveDivisionId = currentDivisionId ?? divisionIdFromUrl ?? null;
  const selectedDivision = effectiveDivisionId ? divisions.find((d) => d.id === effectiveDivisionId) : null;
  const viewerSport = selectedDivision?.sport ?? sport;
  const baseViewerUrl = eventId && viewerSport ? `/sports/${viewerSport}/events/${eventId}` : null;
  const viewerUrl = baseViewerUrl ? (isVisible === false ? `${baseViewerUrl}?preview=1` : baseViewerUrl) : null;
  const q = effectiveDivisionId ? `?divisionId=${effectiveDivisionId}` : "";
  const { t } = useI18n();

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--admin-nav-height", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--admin-nav-height");
    };
  }, []);

  return (
    <nav ref={navRef} className="sticky top-0 z-50 bg-ntu-green text-white shadow-md">
      <div className="container mx-auto px-4 py-2 sm:py-2.5">
        {/* Row 1: Title & Status */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
            <Link
              href="/admin/dashboard"
              className="text-base sm:text-lg font-bold hover:opacity-85 transition-opacity whitespace-nowrap text-white"
            >
              {t("admin.dashboard")}
            </Link>
            {eventId && eventName && (
              <>
                <span className="text-white/40 select-none">|</span>
                <span
                  className="text-sm sm:text-base font-semibold truncate max-w-[180px] sm:max-w-md text-white/95"
                  title={eventName}
                >
                  {eventName}
                </span>
                {isVisible !== undefined && (
                  <EventVisibilityToggle eventId={eventId} initialVisibility={isVisible} />
                )}
              </>
            )}
          </div>
          {eventId && divisions.length > 1 && (
            <div className="shrink-0">
              <Suspense fallback={null}>
                <DivisionSwitcher divisions={divisions} currentDivisionId={effectiveDivisionId} />
              </Suspense>
            </div>
          )}
        </div>

        {/* Row 2: Sub-tabs */}
        {eventId && (
          <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto whitespace-nowrap py-2 text-sm text-emerald-100 no-scrollbar mt-1 border-t border-emerald-700/40">
            {viewerUrl && (
              <Link
                href={viewerUrl}
                className="hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
                title={
                  isVisible === false
                    ? t("admin.previewPublicHint") || "Preview what the public will see when you make the event visible"
                    : "看前台 View on site"
                }
              >
                <span>👁️</span>
                <span>{isVisible === false ? t("admin.previewPublicPage") || "預覽公開頁" : t("admin.viewEvent")}</span>
              </Link>
            )}
            {isVisible === false && (
              <span
                className="text-emerald-300/80 text-xs hidden sm:inline shrink-0"
                title={t("admin.eventHiddenNote") || "Event is hidden — only you can preview it."}
              >
                ({t("admin.hidden") || "已隱藏"})
              </span>
            )}
            <Link
              href={`/admin/${eventId}/players${q}`}
              className={`shrink-0 transition-colors ${
                pathname.startsWith(`/admin/${eventId}/players`)
                  ? "text-white font-bold underline underline-offset-4 decoration-2 decoration-emerald-300"
                  : "hover:text-white"
              }`}
            >
              {t("admin.players")}
            </Link>
            <Link
              href={`/admin/${eventId}/matches${q}`}
              className={`shrink-0 transition-colors ${
                pathname.startsWith(`/admin/${eventId}/matches`)
                  ? "text-white font-bold underline underline-offset-4 decoration-2 decoration-emerald-300"
                  : "hover:text-white"
              }`}
            >
              {t("admin.matches")}
            </Link>
            <Link
              href={`/admin/${eventId}/scheduling${q}`}
              className={`shrink-0 transition-colors ${
                pathname.startsWith(`/admin/${eventId}/scheduling`)
                  ? "text-white font-bold underline underline-offset-4 decoration-2 decoration-emerald-300"
                  : "hover:text-white"
              }`}
            >
              {t("admin.schedule")}
            </Link>
            <Link
              href={`/admin/${eventId}/dispatch${q}`}
              className={`shrink-0 transition-colors ${
                pathname.startsWith(`/admin/${eventId}/dispatch`)
                  ? "text-white font-bold underline underline-offset-4 decoration-2 decoration-emerald-300"
                  : "hover:text-white"
              }`}
            >
              Referees
            </Link>
            <Link
              href={`/admin/${eventId}/announcements${q}`}
              className={`shrink-0 transition-colors ${
                pathname.startsWith(`/admin/${eventId}/announcements`)
                  ? "text-white font-bold underline underline-offset-4 decoration-2 decoration-emerald-300"
                  : "hover:text-white"
              }`}
            >
              {t("admin.announcements")}
            </Link>
            <Link
              href={`/admin/${eventId}/settings${q}`}
              className={`shrink-0 transition-colors ${
                pathname.startsWith(`/admin/${eventId}/settings`)
                  ? "text-white font-bold underline underline-offset-4 decoration-2 decoration-emerald-300"
                  : "hover:text-white"
              }`}
            >
              {t("admin.navSettings")}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

