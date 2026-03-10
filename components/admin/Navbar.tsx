import Link from "next/link";
import { Suspense } from "react";
import LogoutButton from "./LogoutButton";
import DivisionSwitcher from "./DivisionSwitcher";
import EventVisibilityToggle from "./EventVisibilityToggle";

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

export default function AdminNavbar({ eventId, eventName, sport, divisions = [], currentDivisionId = null, isVisible }: AdminNavbarProps) {
  const selectedDivision = currentDivisionId ? divisions.find((d) => d.id === currentDivisionId) : null;
  const viewerSport = selectedDivision?.sport ?? sport;
  const viewerUrl = eventId && viewerSport ? `/sports/${viewerSport}/events/${eventId}` : null;
  const q = currentDivisionId ? `?divisionId=${currentDivisionId}` : "";

  return (
    <nav className="sticky top-0 z-50 bg-ntu-green text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <Link href="/admin/dashboard" className="text-xl font-bold hover:opacity-80 transition-opacity">
              後台
            </Link>
            {eventId && eventName && (
              <div className="flex items-center gap-3">
                <span className="text-white opacity-50">|</span>
                <span className="text-lg">{eventName}</span>
                {isVisible !== undefined && (
                  <EventVisibilityToggle eventId={eventId} initialVisibility={isVisible} />
                )}
              </div>
            )}
            {eventId && divisions.length > 1 && (
              <Suspense fallback={null}>
                <DivisionSwitcher divisions={divisions} currentDivisionId={currentDivisionId} />
              </Suspense>
            )}
          </div>
          {eventId && (
            <div className="flex gap-5 text-sm font-medium items-center">
              {viewerUrl && (
                <Link href={viewerUrl} className="hover:opacity-80 transition-opacity" title="看前台 View on site">
                  看前台
                </Link>
              )}
              <Link href={`/admin/${eventId}/players${q}`} className="hover:opacity-80 transition-opacity" title="管理選手／隊伍、產生籤表、匯入賽季">
                選手
              </Link>
              <Link href={`/admin/${eventId}/matches${q}`} className="hover:opacity-80 transition-opacity" title="比賽列表、比分、統計">
                比賽
              </Link>
              <Link href={`/admin/${eventId}/scheduling${q}`} className="hover:opacity-80 transition-opacity" title="時段與場地、拖曳排程">
                排程
              </Link>
              <Link href={`/admin/${eventId}/announcements${q}`} className="hover:opacity-80 transition-opacity" title="公告管理">
                公告
              </Link>
              <Link href={`/admin/${eventId}/settings${q}`} className="hover:opacity-80 transition-opacity" title="賽事設定">
                設定
              </Link>
            </div>
          )}
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}

