"use client";

import AdminPageSideNav from "./AdminPageSideNav";
import type { AdminPageSideNavLink } from "./AdminPageSideNav";

function buildLinks(
  tournamentType: string | null | undefined,
  eventId: string,
  pendingRequestsCount: number
): AdminPageSideNavLink[] {
  const base =
    tournamentType === "season_play"
      ? [
          { href: "#players-table", label: "選手／隊伍表", barColor: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
          { href: "#generate-season-play", label: "產生賽季", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
          { href: "#import-season-groups", label: "匯入分組", barColor: "bg-amber-500", hoverBg: "hover:bg-amber-50" },
          { href: "#import-season-play", label: "匯入賽季賽程", barColor: "bg-purple-500", hoverBg: "hover:bg-purple-50" },
        ]
      : [
          { href: "#players-table", label: "選手／隊伍表", barColor: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
          { href: "#generate-bracket", label: "產生籤表", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
          { href: "#manual-bracket", label: "手動編輯籤表", barColor: "bg-amber-500", hoverBg: "hover:bg-amber-50" },
          { href: "#import-bracket", label: "匯入籤表", barColor: "bg-purple-500", hoverBg: "hover:bg-purple-50" },
        ];
  const requestsLink: AdminPageSideNavLink = {
    href: `/admin/${eventId}/players/requests`,
    label: "名單變更申請",
    barColor: "bg-rose-500",
    hoverBg: "hover:bg-rose-50",
    badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
  };
  return [...base, requestsLink];
}

interface PlayersPageNavProps {
  tournamentType?: string | null;
  eventId: string;
  pendingRequestsCount?: number;
}

export default function PlayersPageNav({
  tournamentType,
  eventId,
  pendingRequestsCount = 0,
}: PlayersPageNavProps) {
  const links = buildLinks(tournamentType, eventId, pendingRequestsCount);
  return <AdminPageSideNav title="快速導航" links={links} />;
}
