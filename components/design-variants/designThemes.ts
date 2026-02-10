/**
 * Design system theme class maps for Phase 3 UI comparison.
 * Each variant drives Tailwind classes for SeasonPlayDisplay and Landing.
 */

export type DesignVariant = "modern" | "varsity" | "dashboard";

// —— SeasonPlayDisplay: keyed by section/element
export interface SeasonPlayTheme {
  root: string;
  tabsContainer: string;
  tabActive: string;
  tabInactive: string;
  infoBox: string;
  infoBoxText: string;
  tableWrapper: string;
  tableHeader: string;
  tableHeaderCell: string;
  tableRowEven: string;
  tableRowOdd: string;
  tableCell: string;
  badgeCompleted: string;
  badgeLive: string;
  badgeUpcoming: string;
  badgeDelayed: string;
  linkPrimary: string;
  linkPrimaryHover: string;
  card: string;
  cardTitle: string;
  qualifierBorder: string;
  progressBarTrack: string;
  progressBarFill: string;
}

// Version A: Modern & Minimal — clean, whitespace, typography, high-contrast
export const seasonPlayModern: SeasonPlayTheme = {
  root: "space-y-8",
  tabsContainer: "mb-8 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-semibold text-gray-900 bg-gray-50 border-b-2 border-gray-900",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 border-b-2 border-transparent",
  infoBox: "bg-gray-50 border-l-4 border-gray-400 p-5 mb-6 rounded-r-lg",
  infoBoxText: "text-sm text-gray-700",
  tableWrapper: "bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm",
  tableHeader: "bg-gray-900 text-white",
  tableHeaderCell: "px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-gray-50/50",
  tableCell: "px-5 py-3 text-sm",
  badgeCompleted: "inline-block px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded",
  badgeLive: "inline-block px-2.5 py-1 text-xs font-medium text-red-700 bg-red-100 rounded",
  badgeUpcoming: "inline-block px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded",
  badgeDelayed: "inline-block px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-100 rounded",
  linkPrimary: "font-medium text-gray-900",
  linkPrimaryHover: "hover:underline hover:text-gray-700",
  card: "bg-white rounded-lg border border-gray-200 p-6 shadow-sm",
  cardTitle: "text-base font-semibold text-gray-900",
  qualifierBorder: "border-l-4 border-gray-900",
  progressBarTrack: "w-full bg-gray-200 rounded-full h-2",
  progressBarFill: "h-2 rounded-full bg-gray-700 transition-all",
};

// Version B: High Energy / Varsity — bold colors, heavy shadows, gradients, badges
export const seasonPlayVarsity: SeasonPlayTheme = {
  root: "space-y-6",
  tabsContainer: "mb-6 bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 border-b-4 border-amber-700 shadow-inner",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-gray-600 hover:bg-amber-50 border-b-4 border-transparent hover:border-amber-300",
  infoBox: "bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl shadow-md",
  infoBoxText: "text-sm font-medium text-amber-900",
  tableWrapper: "bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden",
  tableHeader: "bg-gradient-to-r from-ntu-green to-green-700 text-white",
  tableHeaderCell: "px-4 py-3 text-center font-bold text-sm uppercase",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-amber-50/40",
  tableCell: "px-4 py-3 text-sm font-medium",
  badgeCompleted: "inline-block px-3 py-1 text-xs font-bold text-green-800 bg-green-400 rounded-full shadow",
  badgeLive: "inline-block px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse shadow",
  badgeUpcoming: "inline-block px-3 py-1 text-xs font-bold text-gray-700 bg-gray-300 rounded-full",
  badgeDelayed: "inline-block px-3 py-1 text-xs font-bold text-amber-900 bg-amber-400 rounded-full",
  linkPrimary: "font-bold text-ntu-green",
  linkPrimaryHover: "hover:text-amber-600 hover:underline",
  card: "bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-6",
  cardTitle: "text-lg font-bold text-ntu-green",
  qualifierBorder: "border-l-4 border-amber-500",
  progressBarTrack: "w-full bg-gray-200 rounded-full h-3",
  progressBarFill: "h-3 rounded-full bg-gradient-to-r from-ntu-green to-green-600 transition-all",
};

// Version C: Dashboard / Utility — dense, tabular, desktop-first
export const seasonPlayDashboard: SeasonPlayTheme = {
  root: "space-y-4",
  tabsContainer: "mb-4 bg-white rounded border border-gray-300 overflow-hidden",
  tabActive: "flex-1 min-w-[120px] px-4 py-2.5 text-sm font-semibold text-white bg-gray-700 border-r border-gray-600",
  tabInactive: "flex-1 min-w-[120px] px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border-r border-gray-300",
  infoBox: "bg-gray-100 border border-gray-300 p-3 mb-4 rounded",
  infoBoxText: "text-xs text-gray-700",
  tableWrapper: "bg-white rounded border border-gray-300 overflow-hidden",
  tableHeader: "bg-gray-700 text-white",
  tableHeaderCell: "px-3 py-2 text-left text-xs font-semibold",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-gray-50",
  tableCell: "px-3 py-2 text-xs",
  badgeCompleted: "inline-block px-1.5 py-0.5 text-xs font-medium text-green-800 bg-green-100 border border-green-300 rounded",
  badgeLive: "inline-block px-1.5 py-0.5 text-xs font-medium text-red-800 bg-red-100 border border-red-300 rounded",
  badgeUpcoming: "inline-block px-1.5 py-0.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-400 rounded",
  badgeDelayed: "inline-block px-1.5 py-0.5 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-400 rounded",
  linkPrimary: "font-semibold text-gray-800",
  linkPrimaryHover: "hover:underline",
  card: "bg-white rounded border border-gray-300 p-4",
  cardTitle: "text-sm font-semibold text-gray-800",
  qualifierBorder: "border-l-2 border-gray-700",
  progressBarTrack: "w-full bg-gray-200 rounded h-1.5",
  progressBarFill: "h-1.5 rounded bg-gray-600 transition-all",
};

export const seasonPlayThemes: Record<DesignVariant, SeasonPlayTheme> = {
  modern: seasonPlayModern,
  varsity: seasonPlayVarsity,
  dashboard: seasonPlayDashboard,
};

// Default (current) classes when no variant is set — match existing SeasonPlayDisplay
export const seasonPlayDefault: SeasonPlayTheme = {
  root: "",
  tabsContainer: "mb-6 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-semibold transition-colors border-b-4 bg-ntu-green text-white border-ntu-green",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-semibold transition-colors border-b-4 bg-white text-gray-700 hover:bg-gray-50 border-transparent",
  infoBox: "bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-lg",
  infoBoxText: "text-sm text-blue-800",
  tableWrapper: "bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden",
  tableHeader: "bg-ntu-green text-white",
  tableHeaderCell: "px-4 py-3 text-center",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-gray-50",
  tableCell: "px-4 py-3",
  badgeCompleted: "inline-block px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded",
  badgeLive: "inline-block px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded animate-pulse",
  badgeUpcoming: "inline-block px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded",
  badgeDelayed: "inline-block px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded",
  linkPrimary: "font-semibold text-ntu-green",
  linkPrimaryHover: "hover:text-ntu-green hover:underline",
  card: "bg-white rounded-xl shadow-md border border-gray-100 p-6",
  cardTitle: "text-lg font-semibold text-ntu-green",
  qualifierBorder: "border-l-4 border-yellow-400",
  progressBarTrack: "w-full bg-gray-200 rounded-full h-3",
  progressBarFill: "bg-ntu-green h-3 rounded-full transition-all",
};
