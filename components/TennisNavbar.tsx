import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TennisNavbar() {
  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link href="/sports/tennis" className="text-xl font-bold text-ntu-green hover:opacity-80 transition-opacity">
            🎾 Tennis
          </Link>

          {/* Navigation Links */}
          <div className="flex gap-1">
            <NavLink href="/sports/tennis/draw" label="籤表 Draw" />
            <NavLink href="/sports/tennis/schedule" label="賽程 Schedule" />
            <NavLink href="/sports/tennis/announcements" label="公告 Announcements" />
          </div>

          {/* Back to Home */}
          <Link 
            href="/" 
            className="text-sm text-gray-600 hover:text-ntu-green transition-colors"
          >
            ← Home
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-ntu-green hover:text-white transition-colors"
    >
      {label}
    </Link>
  );
}

