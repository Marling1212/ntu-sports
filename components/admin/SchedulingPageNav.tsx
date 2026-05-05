"use client";

import AdminPageSideNav from "./AdminPageSideNav";

const links = [
  { href: "#import-schedule", label: "匯入賽程", barColor: "bg-slate-500", hoverBg: "hover:bg-slate-50" },
  { href: "#courts", label: "場地管理", barColor: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
  { href: "#slot-templates", label: "時段範本", barColor: "bg-purple-500", hoverBg: "hover:bg-purple-50" },
  { href: "#available-slots", label: "可用時段", barColor: "bg-indigo-500", hoverBg: "hover:bg-indigo-50" },
  { href: "#auto-schedule", label: "一鍵排程", barColor: "bg-emerald-600", hoverBg: "hover:bg-emerald-50" },
  { href: "#schedule-editor", label: "排程編輯（拖曳）", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
  { href: "#schedule-items", label: "比賽日與賽程說明", barColor: "bg-amber-500", hoverBg: "hover:bg-amber-50" },
];

export default function SchedulingPageNav() {
  return <AdminPageSideNav title="快速導航" links={links} />;
}
