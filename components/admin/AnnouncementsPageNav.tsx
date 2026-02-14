"use client";

import AdminPageSideNav from "./AdminPageSideNav";

const links = [
  { href: "#announcements", label: "公告管理", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
];

export default function AnnouncementsPageNav() {
  return <AdminPageSideNav title="快速導航" links={links} />;
}
