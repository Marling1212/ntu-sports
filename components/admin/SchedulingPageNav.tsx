"use client";

const links: { href: string; label: string; barColor: string; hoverBg: string }[] = [
  { href: "#import-schedule", label: "匯入賽程", barColor: "bg-slate-500", hoverBg: "hover:bg-slate-50" },
  { href: "#courts", label: "場地管理", barColor: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
  { href: "#slot-templates", label: "時段範本", barColor: "bg-purple-500", hoverBg: "hover:bg-purple-50" },
  { href: "#available-slots", label: "可用時段", barColor: "bg-indigo-500", hoverBg: "hover:bg-indigo-50" },
  { href: "#auto-schedule", label: "一鍵排程", barColor: "bg-emerald-600", hoverBg: "hover:bg-emerald-50" },
  { href: "#schedule-editor", label: "排程編輯（拖曳）", barColor: "bg-ntu-green", hoverBg: "hover:bg-green-50" },
];

export default function SchedulingPageNav() {
  return (
    <div
      className="group peer flex w-12 shrink-0 transition-[width] duration-300 ease-out hover:w-56"
      aria-label="排程快速導航（滑過展開）"
    >
      <nav
        className="fixed left-0 top-20 z-40 flex h-[calc(100vh-5rem)] w-12 flex-col overflow-hidden border-r border-gray-200 bg-white shadow-sm transition-[width] duration-300 ease-out hover:w-56 group-hover:w-56"
        aria-label="排程頁快速導航"
      >
        <div className="flex min-h-[3rem] items-center border-b border-gray-100 px-2 py-3">
          <span className="w-1.5 shrink-0 rounded-full bg-ntu-green" aria-hidden="true" />
          <p className="ml-2.5 shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-gray-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            快速導航
          </p>
          <span className="ml-auto text-gray-400 text-xs opacity-100 transition-opacity group-hover:opacity-0" aria-hidden="true" title="滑過展開">
            »
          </span>
        </div>
        <ul className="flex flex-1 flex-col gap-0.5 px-2 py-2">
          {links.map(({ href, label, barColor, hoverBg }) => (
            <li key={href}>
              <a
                href={href}
                className={`flex items-center rounded-r-lg py-2.5 pl-2 pr-2 text-sm font-medium text-gray-700 transition-colors ${hoverBg}`}
              >
                <span className={`h-5 w-1 shrink-0 rounded-full ${barColor}`} aria-hidden="true" />
                <span className="ml-2.5 min-w-0 shrink-0 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="w-full shrink-0" aria-hidden="true" />
    </div>
  );
}
