"use client";

export interface AdminPageSideNavLink {
  href: string;
  label: string;
  barColor: string;
  hoverBg: string;
}

interface AdminPageSideNavProps {
  title: string;
  links: AdminPageSideNavLink[];
}

export default function AdminPageSideNav({ title, links }: AdminPageSideNavProps) {
  return (
    <div
      className="group peer flex w-12 shrink-0 transition-[width] duration-300 ease-out hover:w-56"
      aria-label={`${title}（滑過展開）`}
    >
      <nav
        className="fixed left-0 top-24 z-40 flex h-[calc(100vh-6rem)] w-12 flex-col overflow-hidden border-r border-gray-200 bg-white shadow-sm transition-[width] duration-300 ease-out hover:w-56 group-hover:w-56"
        aria-label={title}
      >
        <div className="flex min-h-[3rem] items-center border-b border-gray-100 px-2 py-3">
          <span className="w-1.5 shrink-0 rounded-full bg-ntu-green" aria-hidden="true" />
          <p className="ml-2.5 shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-gray-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {title}
          </p>
          <span className="ml-auto text-xs text-gray-400 opacity-100 transition-opacity group-hover:opacity-0" aria-hidden="true" title="滑過展開">
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
