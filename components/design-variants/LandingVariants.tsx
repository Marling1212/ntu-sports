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

export default function LandingVariants({ variant, sportsToShow, isLoading }: LandingVariantsProps) {
  const { t } = useI18n();
  const props = { sportsToShow, isLoading, t };
  if (variant === "modern") return <LandingModern {...props} />;
  if (variant === "varsity") return <LandingVarsity {...props} />;
  return <LandingDashboard {...props} />;
}
