"use client";

import AdminPageSideNav from "./AdminPageSideNav";

const links = [
  { href: "#players-table", label: "選手／隊伍表", barColor: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
  { href: "#generate-section", label: "產生籤表／賽季", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
];

export default function PlayersPageNav() {
  return <AdminPageSideNav title="快速導航" links={links} />;
}
