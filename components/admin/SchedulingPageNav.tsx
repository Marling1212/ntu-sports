"use client";

const links: { href: string; label: string; color: string }[] = [
  { href: "#import-schedule", label: "匯入賽程", color: "bg-slate-600" },
  { href: "#courts", label: "場地管理", color: "bg-blue-500" },
  { href: "#slot-templates", label: "時段範本", color: "bg-purple-500" },
  { href: "#available-slots", label: "可用時段", color: "bg-indigo-500" },
  { href: "#auto-schedule", label: "一鍵排程", color: "bg-emerald-600" },
  { href: "#schedule-editor", label: "排程編輯（拖曳）", color: "bg-ntu-green" },
];

export default function SchedulingPageNav() {
  return (
    <nav
      className="fixed left-0 right-0 top-16 z-50 flex w-full border-b border-gray-200 bg-white py-3 shadow-md"
      aria-label="排程頁快速導航"
    >
      <div className="container mx-auto flex h-full flex-wrap items-center gap-2 px-4">
        <span className="mr-2 text-sm font-semibold text-gray-600">快速導航：</span>
        {links.map(({ href, label, color }) => (
          <a
            key={href}
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 ${color}`}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
