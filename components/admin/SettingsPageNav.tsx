"use client";

import { useParams } from "next/navigation";
import AdminPageSideNav from "./AdminPageSideNav";

const baseLinks = [
  { href: "#settings-basic", label: "基本資訊", barColor: "bg-slate-500", hoverBg: "hover:bg-slate-50" },
  { href: "#settings-divisions", label: "賽事項目／分組", barColor: "bg-emerald-600", hoverBg: "hover:bg-emerald-50" },
  { href: "#settings-rules", label: "賽事規則", barColor: "bg-amber-500", hoverBg: "hover:bg-amber-50" },
  { href: "#settings-sponsors", label: "Event Sponsors", barColor: "bg-purple-500", hoverBg: "hover:bg-purple-50" },
  { href: "#settings-data-backup", label: "資料備份與還原", barColor: "bg-cyan-600", hoverBg: "hover:bg-cyan-50" },
  { href: "#settings-games", label: "運動／遊戲管理", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
];

export default function SettingsPageNav() {
  const params = useParams();
  const eventId = params?.eventId as string | undefined;
  const auditLink = eventId
    ? { href: `/admin/${eventId}/settings/audit`, label: "操作紀錄 (Audit Log)", barColor: "bg-gray-600", hoverBg: "hover:bg-gray-50" }
    : null;
  const links = auditLink ? [...baseLinks, auditLink] : baseLinks;
  return <AdminPageSideNav title="快速導航" links={links} />;
}
