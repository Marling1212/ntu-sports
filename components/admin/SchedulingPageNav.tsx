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
      className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/95 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90"
      aria-label="排程頁快速導航"
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center gap-2">
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
      </div>
    </nav>
  );
}
