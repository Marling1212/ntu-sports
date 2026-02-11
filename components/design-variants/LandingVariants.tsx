"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { DesignVariant } from "./designThemes";
import SkeletonLoader from "@/components/SkeletonLoader";
import LoadingLink from "@/components/LoadingLink";

const sportIcons: Record<string, string> = {
  Tennis: "🎾",
  Soccer: "⚽",
  Basketball: "🏀",
  Volleyball: "🏐",
  Badminton: "🏸",
  TableTennis: "🏓",
  Baseball: "⚾",
  Softball: "🥎",
};

const sportColors: Record<string, string> = {
  Tennis: "bg-green-500",
  Soccer: "bg-emerald-500",
  Basketball: "bg-orange-500",
  Volleyball: "bg-blue-500",
  Badminton: "bg-yellow-500",
  TableTennis: "bg-red-500",
  Baseball: "bg-indigo-500",
  Softball: "bg-pink-500",
};

interface LandingVariantsProps {
  variant: DesignVariant;
  sportsToShow: string[];
  isLoading: boolean;
}

// Version A: Modern & Minimal
function LandingModern({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-4">
          {t("home.title")}
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto">
          {t("home.subtitle")}
        </p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} variant="card" className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {sportsToShow.map((sport) => {
            const icon = sportIcons[sport] || "🏆";
            return (
              <LoadingLink
                key={sport}
                href={`/sports/${sport.toLowerCase()}`}
                className="block p-8 border border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50/50 transition-colors group"
              >
                <span className="text-3xl font-light text-gray-900 block mb-2">{sport}</span>
                <span className="text-4xl">{icon}</span>
                <span className="mt-4 inline-block text-sm text-gray-500 group-hover:text-gray-700">
                  {t("home.viewDetails")} →
                </span>
              </LoadingLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Version B: High Energy / Varsity
function LandingVarsity({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ntu-green via-green-700 to-green-900 px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-block px-6 py-2 bg-white/20 rounded-full text-white font-bold text-sm uppercase tracking-wider mb-6">
          NTU Sports
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-lg mb-4">
          🏆 {t("home.title")}
        </h1>
        <p className="text-xl text-white/90 font-semibold max-w-2xl mx-auto">
          {t("home.subtitle")}
        </p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {sportsToShow.map((sport, i) => {
            const colorClass = sportColors[sport] || "bg-ntu-green";
            return (
              <LoadingLink
                key={sport}
                href={`/sports/${sport.toLowerCase()}`}
                className={`${colorClass} rounded-2xl shadow-2xl p-6 text-center transform hover:scale-105 hover:rotate-1 transition-all duration-300 border-4 border-white/30`}
              >
                <span className="text-4xl block mb-2">{sportIcons[sport] || "🏆"}</span>
                <span className="text-lg font-black text-white uppercase tracking-wide">{sport}</span>
                <span className="block mt-2 text-white/90 text-sm font-bold">{t("home.viewDetails")} →</span>
              </LoadingLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Version C: Dashboard / Utility
function LandingDashboard({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-xl font-bold text-gray-800">{t("home.title")}</h1>
        <p className="text-sm text-gray-600 mt-1">{t("home.subtitle")}</p>
      </div>
      <p className="text-xs text-gray-500 mb-4">{t("home.sports")}</p>
      {isLoading ? (
        <table className="w-full border border-gray-300 text-sm">
          <thead><tr><th className="border border-gray-300 px-3 py-2 text-left">Sport</th><th className="border border-gray-300 px-3 py-2">Action</th></tr></thead>
          <tbody>
            {[1, 2, 3, 4].map((i) => (
              <tr key={i}><td className="border border-gray-300 px-3 py-2">—</td><td className="border border-gray-300 px-3 py-2">—</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="w-full border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">#</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Sport</th>
              <th className="border border-gray-300 px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {sportsToShow.map((sport, idx) => (
              <tr key={sport} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
                <td className="border border-gray-300 px-3 py-2 font-medium">{sport}</td>
                <td className="border border-gray-300 px-3 py-2">
                  <Link href={`/sports/${sport.toLowerCase()}`} className="text-blue-600 hover:underline font-medium">
                    {t("home.viewDetails")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Version D: Editorial / Magazine — big hero typography, feature block
function LandingEditorial({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <header className="border-b-4 border-black pb-12 mb-12">
        <h1 className="text-5xl md:text-6xl font-bold text-black tracking-tight mb-4 font-serif">
          {t("home.title")}
        </h1>
        <p className="text-xl text-gray-700 max-w-2xl">
          {t("home.subtitle")}
        </p>
      </header>
      <p className="text-sm uppercase tracking-widest text-gray-500 mb-6">{t("home.sports")}</p>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 border border-gray-300 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {sportsToShow.map((sport) => (
            <LoadingLink
              key={sport}
              href={`/sports/${sport.toLowerCase()}`}
              className="block border-l-4 border-black pl-6 py-4 hover:bg-gray-50 transition-colors group"
            >
              <span className="text-2xl font-bold text-black block">{sport}</span>
              <span className="text-3xl mt-2 block">{sportIcons[sport] || "🏆"}</span>
              <span className="text-sm text-gray-500 mt-2 group-hover:text-black">{t("home.viewDetails")} →</span>
            </LoadingLink>
          ))}
        </div>
      )}
    </div>
  );
}

// Version E: Mobile-first / App-like — large tap targets, rounded cards
function LandingMobile({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("home.title")}</h1>
        <p className="text-base text-gray-600">{t("home.subtitle")}</p>
      </div>
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sportsToShow.map((sport) => (
            <LoadingLink
              key={sport}
              href={`/sports/${sport.toLowerCase()}`}
              className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-lg border border-gray-100 active:scale-[0.98] transition-transform min-h-[88px]"
            >
              <span className="text-4xl">{sportIcons[sport] || "🏆"}</span>
              <div className="flex-1 text-left">
                <span className="text-lg font-bold text-gray-900 block">{sport}</span>
                <span className="text-sm text-ntu-green font-medium">{t("home.viewDetails")}</span>
              </div>
              <span className="text-2xl text-gray-400">›</span>
            </LoadingLink>
          ))}
        </div>
      )}
    </div>
  );
}

// Version F: Neobrutalist — hard shadows, thick borders
function LandingNeobrutalist({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-yellow-300 border-4 border-black p-8 mb-10 shadow-[8px_8px_0_0_#000]">
        <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tight mb-2">
          {t("home.title")}
        </h1>
        <p className="text-lg font-bold text-black">{t("home.subtitle")}</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 border-4 border-black animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sportsToShow.map((sport) => (
            <LoadingLink
              key={sport}
              href={`/sports/${sport.toLowerCase()}`}
              className="block bg-white border-4 border-black p-6 text-center shadow-[6px_6px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all"
            >
              <span className="text-4xl block mb-2">{sportIcons[sport] || "🏆"}</span>
              <span className="text-lg font-black text-black uppercase">{sport}</span>
              <span className="text-sm font-bold text-black mt-2 block">{t("home.viewDetails")} →</span>
            </LoadingLink>
          ))}
        </div>
      )}
    </div>
  );
}

// Version G: Glassmorphism — frosted panels
function LandingGlass({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ntu-green/20 via-green-100/30 to-ntu-green/10 px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/70 shadow-xl p-10 mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{t("home.title")}</h1>
          <p className="text-lg text-gray-700">{t("home.subtitle")}</p>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 rounded-3xl bg-white/40 backdrop-blur animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {sportsToShow.map((sport) => (
              <LoadingLink
                key={sport}
                href={`/sports/${sport.toLowerCase()}`}
                className="block rounded-3xl bg-white/60 backdrop-blur-xl border border-white/70 p-8 shadow-lg hover:bg-white/80 transition-colors group"
              >
                <span className="text-4xl block mb-3">{sportIcons[sport] || "🏆"}</span>
                <span className="text-xl font-semibold text-gray-900 block">{sport}</span>
                <span className="text-sm text-ntu-green font-medium mt-2 group-hover:underline">{t("home.viewDetails")} →</span>
              </LoadingLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Version H: Split / Asymmetric — sidebar + main
function LandingSplit({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-gray-300 bg-gray-50 p-6 shrink-0">
        <h1 className="text-lg font-bold text-gray-800">{t("home.title")}</h1>
        <p className="text-xs text-gray-500 mt-2">{t("home.subtitle")}</p>
      </aside>
      <main className="flex-1 p-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">{t("home.sports")}</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 border border-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {sportsToShow.map((sport) => (
              <li key={sport}>
                <LoadingLink
                  href={`/sports/${sport.toLowerCase()}`}
                  className="flex items-center gap-4 py-3 px-4 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-2xl">{sportIcons[sport] || "🏆"}</span>
                  <span className="font-medium text-gray-800 flex-1">{sport}</span>
                  <span className="text-sm text-gray-500">{t("home.viewDetails")} →</span>
                </LoadingLink>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

// Version I: Dark / Arena
function LandingDark({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="min-h-screen bg-gray-900 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            🏆 {t("home.title")}
          </h1>
          <p className="text-lg text-gray-400">{t("home.subtitle")}</p>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-800 rounded-xl animate-pulse border border-gray-700" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sportsToShow.map((sport) => (
              <LoadingLink
                key={sport}
                href={`/sports/${sport.toLowerCase()}`}
                className="block bg-gray-800 border border-gray-700 rounded-xl p-6 text-center hover:border-ntu-green hover:bg-gray-800/80 transition-all group"
              >
                <span className="text-4xl block mb-2">{sportIcons[sport] || "🏆"}</span>
                <span className="text-base font-bold text-white block">{sport}</span>
                <span className="text-xs text-ntu-green font-medium mt-1 group-hover:text-amber-400">{t("home.viewDetails")}</span>
              </LoadingLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// J: Neobrutalist + NTU Green
function LandingBrutalGreen({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-ntu-green border-4 border-black p-8 mb-10 shadow-[8px_8px_0_0_#000]">
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-2">
          {t("home.title")}
        </h1>
        <p className="text-lg font-bold text-white/90">{t("home.subtitle")}</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-green-100 border-4 border-black animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sportsToShow.map((sport) => (
            <LoadingLink
              key={sport}
              href={`/sports/${sport.toLowerCase()}`}
              className="block bg-white border-4 border-black p-6 text-center shadow-[6px_6px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all"
            >
              <span className="text-4xl block mb-2">{sportIcons[sport] || "🏆"}</span>
              <span className="text-lg font-black text-black uppercase">{sport}</span>
              <span className="text-sm font-bold text-ntu-green mt-2 block">{t("home.viewDetails")} →</span>
            </LoadingLink>
          ))}
        </div>
      )}
    </div>
  );
}

// K: Rounded brutalist
function LandingBrutalRounded({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-yellow-300 rounded-2xl border-4 border-black p-8 mb-10 shadow-[8px_8px_0_0_#000]">
        <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tight mb-2">
          {t("home.title")}
        </h1>
        <p className="text-lg font-bold text-black">{t("home.subtitle")}</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl border-4 border-black animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sportsToShow.map((sport) => (
            <LoadingLink
              key={sport}
              href={`/sports/${sport.toLowerCase()}`}
              className="block bg-white rounded-2xl border-4 border-black p-6 text-center shadow-[6px_6px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all"
            >
              <span className="text-4xl block mb-2">{sportIcons[sport] || "🏆"}</span>
              <span className="text-lg font-black text-black uppercase">{sport}</span>
              <span className="text-sm font-bold text-black mt-2 block">{t("home.viewDetails")} →</span>
            </LoadingLink>
          ))}
        </div>
      )}
    </div>
  );
}

// L: Two-color only (black + yellow)
function LandingBrutalTwocolor({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 bg-white">
      <div className="bg-yellow-300 border-4 border-black p-8 mb-10 shadow-[8px_8px_0_0_#000]">
        <h1 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tight mb-2">
          {t("home.title")}
        </h1>
        <p className="text-lg font-black text-black">{t("home.subtitle")}</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white border-4 border-black animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sportsToShow.map((sport) => (
            <LoadingLink
              key={sport}
              href={`/sports/${sport.toLowerCase()}`}
              className="block bg-white border-4 border-black p-6 text-center shadow-[6px_6px_0_0_#000] hover:bg-yellow-100 transition-colors"
            >
              <span className="text-4xl block mb-2">{sportIcons[sport] || "🏆"}</span>
              <span className="text-lg font-black text-black uppercase">{sport}</span>
              <span className="text-sm font-black text-black mt-2 block">{t("home.viewDetails")} →</span>
            </LoadingLink>
          ))}
        </div>
      )}
    </div>
  );
}

// M: Section accent colors
function LandingBrutalSections({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-ntu-green border-4 border-black p-8 mb-10 shadow-[8px_8px_0_0_#000]">
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-2">
          {t("home.title")}
        </h1>
        <p className="text-lg font-bold text-white/90">{t("home.subtitle")}</p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-amber-50 border-4 border-black animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sportsToShow.map((sport) => (
            <LoadingLink
              key={sport}
              href={`/sports/${sport.toLowerCase()}`}
              className="block bg-white border-4 border-black p-6 text-center shadow-[6px_6px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all"
            >
              <span className="text-4xl block mb-2">{sportIcons[sport] || "🏆"}</span>
              <span className="text-lg font-black text-black uppercase">{sport}</span>
              <span className="text-sm font-bold text-ntu-green mt-2 block">{t("home.viewDetails")} →</span>
            </LoadingLink>
          ))}
        </div>
      )}
    </div>
  );
}

// N: Inverted brutalist (dark base)
function LandingBrutalInverted({ sportsToShow, isLoading, t }: { sportsToShow: string[]; isLoading: boolean; t: (k: string) => string }) {
  return (
    <div className="min-h-screen bg-gray-900 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 border-4 border-white p-8 mb-10 rounded-xl shadow-[8px_8px_0_0_rgba(255,255,255,0.3)]">
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-2">
            {t("home.title")}
          </h1>
          <p className="text-lg font-bold text-white/90">{t("home.subtitle")}</p>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-800 rounded-xl border-4 border-white animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {sportsToShow.map((sport) => (
              <LoadingLink
                key={sport}
                href={`/sports/${sport.toLowerCase()}`}
                className="block bg-gray-800 rounded-xl border-4 border-white p-6 text-center shadow-[6px_6px_0_0_rgba(255,255,255,0.25)] hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                <span className="text-4xl block mb-2">{sportIcons[sport] || "🏆"}</span>
                <span className="text-lg font-black text-white uppercase">{sport}</span>
                <span className="text-sm font-bold text-ntu-green mt-2 block">{t("home.viewDetails")} →</span>
              </LoadingLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingVariants({ variant, sportsToShow, isLoading }: LandingVariantsProps) {
  const { t } = useI18n();
  const props = { sportsToShow, isLoading, t };
  if (variant === "modern") return <LandingModern {...props} />;
  if (variant === "varsity") return <LandingVarsity {...props} />;
  if (variant === "dashboard") return <LandingDashboard {...props} />;
  if (variant === "editorial") return <LandingEditorial {...props} />;
  if (variant === "mobile") return <LandingMobile {...props} />;
  if (variant === "neobrutalist") return <LandingNeobrutalist {...props} />;
  if (variant === "glass") return <LandingGlass {...props} />;
  if (variant === "split") return <LandingSplit {...props} />;
  if (variant === "dark") return <LandingDark {...props} />;
  if (variant === "brutal-green") return <LandingBrutalGreen {...props} />;
  if (variant === "brutal-rounded") return <LandingBrutalRounded {...props} />;
  if (variant === "brutal-twocolor") return <LandingBrutalTwocolor {...props} />;
  if (variant === "brutal-sections") return <LandingBrutalSections {...props} />;
  if (variant === "brutal-inverted") return <LandingBrutalInverted {...props} />;
  return <LandingModern {...props} />;
}
