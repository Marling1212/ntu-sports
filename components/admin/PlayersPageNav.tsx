"use client";

import AdminPageSideNav from "./AdminPageSideNav";
import type { AdminPageSideNavLink } from "./AdminPageSideNav";

const seasonPlayLinks: AdminPageSideNavLink[] = [
  { href: "#players-table", label: "選手／隊伍表", barColor: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
  { href: "#generate-season-play", label: "產生賽季", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
  { href: "#import-season-groups", label: "匯入分組", barColor: "bg-amber-500", hoverBg: "hover:bg-amber-50" },
  { href: "#import-season-play", label: "匯入賽季賽程", barColor: "bg-purple-500", hoverBg: "hover:bg-purple-50" },
];

const bracketLinks: AdminPageSideNavLink[] = [
  { href: "#players-table", label: "選手／隊伍表", barColor: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
  { href: "#generate-bracket", label: "產生籤表", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
  { href: "#manual-bracket", label: "手動編輯籤表", barColor: "bg-amber-500", hoverBg: "hover:bg-amber-50" },
  { href: "#import-bracket", label: "匯入籤表", barColor: "bg-purple-500", hoverBg: "hover:bg-purple-50" },
];

interface PlayersPageNavProps {
  tournamentType?: string | null;
}

export default function PlayersPageNav({ tournamentType }: PlayersPageNavProps) {
  const links = tournamentType === "season_play" ? seasonPlayLinks : bracketLinks;
  return <AdminPageSideNav title="快速導航" links={links} />;
}
