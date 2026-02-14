"use client";

import AdminPageSideNav from "./AdminPageSideNav";

const links = [
  { href: "#bracket-seeding", label: "籤表／種子", barColor: "bg-amber-500", hoverBg: "hover:bg-amber-50" },
  { href: "#search-filters", label: "搜尋與篩選", barColor: "bg-slate-500", hoverBg: "hover:bg-slate-50" },
  { href: "#matches-table", label: "比賽列表", barColor: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
  { href: "#player-stats", label: "選手統計", barColor: "bg-emerald-600", hoverBg: "hover:bg-emerald-50" },
  { href: "#match-history", label: "賽程紀錄", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
];

export default function MatchesPageNav() {
  return <AdminPageSideNav title="快速導航" links={links} />;
}
