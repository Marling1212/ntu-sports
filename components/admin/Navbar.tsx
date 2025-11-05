import Link from "next/link";
import LogoutButton from "./LogoutButton";

interface AdminNavbarProps {
  eventId?: string;
  eventName?: string;
}

export default function AdminNavbar({ eventId, eventName }: AdminNavbarProps) {
  return (
    <nav className="bg-ntu-green text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/dashboard" className="text-xl font-bold hover:opacity-80 transition-opacity">
              Admin Dashboard
            </Link>
            {eventId && eventName && (
              <>
                <span className="text-white opacity-50">|</span>
                <span className="text-lg">{eventName}</span>
              </>
            )}
          </div>
          {eventId && (
            <div className="flex gap-4 text-sm">
              <Link href={`/admin/${eventId}/players`} className="hover:opacity-80 transition-opacity">
                Players
              </Link>
              <Link href={`/admin/${eventId}/matches`} className="hover:opacity-80 transition-opacity">
                Matches
              </Link>
              <Link href={`/admin/${eventId}/announcements`} className="hover:opacity-80 transition-opacity">
                Announcements
              </Link>
              <Link href={`/admin/${eventId}/settings`} className="hover:opacity-80 transition-opacity">
                Settings
              </Link>
            </div>
          )}
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}

