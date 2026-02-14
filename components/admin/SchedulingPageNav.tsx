"use client";

const links: { href: string; label: string; accent: string }[] = [
  { href: "#import-schedule", label: "匯入賽程", accent: "border-l-slate-500 bg-slate-50" },
  { href: "#courts", label: "場地管理", accent: "border-l-blue-500 bg-blue-50" },
  { href: "#slot-templates", label: "時段範本", accent: "border-l-purple-500 bg-purple-50" },
  { href: "#available-slots", label: "可用時段", accent: "border-l-indigo-500 bg-indigo-50" },
  { href: "#auto-schedule", label: "一鍵排程", accent: "border-l-emerald-600 bg-emerald-50" },
  { href: "#schedule-editor", label: "排程編輯（拖曳）", accent: "border-l-ntu-green bg-green-50" },
];

const SIDEBAR_WIDTH = "14rem"; /* w-56 */

export default function SchedulingPageNav() {
  return (
    <>
      <nav
        className="fixed left-0 top-20 z-40 flex h-[calc(100vh-5rem)] w-56 flex-col border-r border-gray-200 bg-white py-4 shadow-sm"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="排程頁快速導航"
      >
        <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          快速導航
        </p>
        <ul className="flex flex-1 flex-col gap-0.5 px-2">
          {links.map(({ href, label, accent }) => (
            <li key={href}>
              <a
                href={href}
                className={`block rounded-r-lg border-l-4 py-2.5 px-3 text-sm font-medium text-gray-700 transition-colors hover:opacity-90 ${accent}`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {/* Spacer so main content has room and doesn't sit under the sidebar */}
      <div className="shrink-0" style={{ width: SIDEBAR_WIDTH }} aria-hidden="true" />
    </>
  );
}
