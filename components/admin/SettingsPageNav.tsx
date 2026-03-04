"use client";

import AdminPageSideNav from "./AdminPageSideNav";

const links = [
  { href: "#settings-basic", label: "基本資訊", barColor: "bg-slate-500", hoverBg: "hover:bg-slate-50" },
  { href: "#settings-divisions", label: "賽事項目／分組", barColor: "bg-emerald-600", hoverBg: "hover:bg-emerald-50" },
  { href: "#settings-rules", label: "賽事規則", barColor: "bg-amber-500", hoverBg: "hover:bg-amber-50" },
  { href: "#settings-sponsors", label: "Event Sponsors", barColor: "bg-purple-500", hoverBg: "hover:bg-purple-50" },
  { href: "#settings-schedule", label: "比賽行程", barColor: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
  { href: "#settings-games", label: "運動／遊戲管理", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
];

export default function SettingsPageNav() {
  return <AdminPageSideNav title="快速導航" links={links} />;
}
