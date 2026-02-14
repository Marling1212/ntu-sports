import Link from "next/link";
import LogoutButton from "./LogoutButton";

interface AdminNavbarProps {
  eventId?: string;
  eventName?: string;
}

export default function AdminNavbar({ eventId, eventName }: AdminNavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-ntu-green text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="text-xl font-bold hover:opacity-80 transition-opacity">
              後台
            </Link>
            {eventId && eventName && (
              <>
                <span className="text-white opacity-50">|</span>
                <span className="text-lg">{eventName}</span>
              </>
            )}
          </div>
          {eventId && (
            <div className="flex gap-5 text-sm font-medium">
              <Link href={`/admin/${eventId}/players`} className="hover:opacity-80 transition-opacity" title="管理選手／隊伍、產生籤表、匯入賽季">
                選手
              </Link>
              <Link href={`/admin/${eventId}/matches`} className="hover:opacity-80 transition-opacity" title="比賽列表、比分、統計">
                比賽
              </Link>
              <Link href={`/admin/${eventId}/scheduling`} className="hover:opacity-80 transition-opacity" title="時段與場地、拖曳排程">
                排程
              </Link>
              <Link href={`/admin/${eventId}/announcements`} className="hover:opacity-80 transition-opacity" title="公告管理">
                公告
              </Link>
              <Link href={`/admin/${eventId}/settings`} className="hover:opacity-80 transition-opacity" title="賽事設定">
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

