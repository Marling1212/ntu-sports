/**
 * Design system theme class maps for Phase 3 UI comparison.
 * Each variant drives Tailwind classes for SeasonPlayDisplay and Landing.
 */

export type DesignVariant =
  | "modern"
  | "varsity"
  | "dashboard"
  | "editorial"
  | "mobile"
  | "neobrutalist"
  | "glass"
  | "split"
  | "dark"
  | "brutal-green"
  | "brutal-rounded"
  | "brutal-twocolor"
  | "brutal-sections"
  | "brutal-inverted";

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

// Version D: Editorial / Magazine — big typography, feature-first
export const seasonPlayEditorial: SeasonPlayTheme = {
  root: "space-y-10",
  tabsContainer: "mb-10 bg-white border-t-4 border-black overflow-hidden",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-white bg-black border-b-4 border-black",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-gray-600 hover:bg-gray-100 border-b-4 border-transparent",
  infoBox: "bg-gray-100 border-l-4 border-black p-6 mb-8",
  infoBoxText: "text-base font-serif text-gray-800",
  tableWrapper: "bg-white border border-gray-300 overflow-hidden",
  tableHeader: "bg-black text-white",
  tableHeaderCell: "px-6 py-4 text-left text-sm font-bold uppercase tracking-widest",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-gray-50",
  tableCell: "px-6 py-4 text-base",
  badgeCompleted: "inline-block px-3 py-1.5 text-xs font-bold text-black bg-gray-200 uppercase",
  badgeLive: "inline-block px-3 py-1.5 text-xs font-bold text-white bg-red-600 uppercase",
  badgeUpcoming: "inline-block px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-200 uppercase",
  badgeDelayed: "inline-block px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-200 uppercase",
  linkPrimary: "font-bold text-black",
  linkPrimaryHover: "hover:underline",
  card: "bg-white border border-gray-300 p-6",
  cardTitle: "text-lg font-bold text-black",
  qualifierBorder: "border-l-4 border-black",
  progressBarTrack: "w-full bg-gray-200 h-2",
  progressBarFill: "h-2 bg-black transition-all",
};

// Version E: Mobile-first / App-like — large touch targets, soft corners
export const seasonPlayMobile: SeasonPlayTheme = {
  root: "space-y-6",
  tabsContainer: "mb-6 bg-white rounded-2xl shadow-lg overflow-hidden",
  tabActive: "flex-1 min-w-[140px] px-5 py-5 font-bold text-white bg-ntu-green rounded-t-2xl",
  tabInactive: "flex-1 min-w-[140px] px-5 py-5 font-semibold text-gray-500 hover:bg-gray-50 rounded-t-xl",
  infoBox: "bg-ntu-green/10 rounded-2xl p-5 mb-6 border-2 border-ntu-green/20",
  infoBoxText: "text-base text-gray-800",
  tableWrapper: "bg-white rounded-2xl shadow-lg overflow-hidden",
  tableHeader: "bg-ntu-green text-white",
  tableHeaderCell: "px-4 py-4 text-left text-sm font-bold",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-gray-50/80",
  tableCell: "px-4 py-4 text-base",
  badgeCompleted: "inline-block px-4 py-2 text-sm font-bold text-green-800 bg-green-100 rounded-full",
  badgeLive: "inline-block px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-full animate-pulse",
  badgeUpcoming: "inline-block px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-full",
  badgeDelayed: "inline-block px-4 py-2 text-sm font-bold text-amber-800 bg-amber-100 rounded-full",
  linkPrimary: "font-bold text-ntu-green",
  linkPrimaryHover: "hover:underline active:opacity-80",
  card: "bg-white rounded-2xl shadow-lg p-6 border border-gray-100",
  cardTitle: "text-lg font-bold text-ntu-green",
  qualifierBorder: "border-l-4 border-ntu-green rounded-l",
  progressBarTrack: "w-full bg-gray-200 rounded-full h-3",
  progressBarFill: "h-3 rounded-full bg-ntu-green transition-all",
};

// Version F: Neobrutalist — hard shadows, thick borders, high contrast
export const seasonPlayNeobrutalist: SeasonPlayTheme = {
  root: "space-y-6",
  tabsContainer: "mb-6 bg-white border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-black text-white bg-black border-r-4 border-black last:border-r-0",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-black bg-yellow-300 hover:bg-yellow-200 border-r-4 border-black last:border-r-0",
  infoBox: "bg-yellow-300 border-4 border-black p-4 mb-6 shadow-[4px_4px_0_0_#000]",
  infoBoxText: "text-sm font-bold text-black",
  tableWrapper: "bg-white border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tableHeader: "bg-black text-white",
  tableHeaderCell: "px-4 py-3 text-left text-sm font-black uppercase",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-yellow-50",
  tableCell: "px-4 py-3 text-sm font-semibold",
  badgeCompleted: "inline-block px-3 py-1 text-xs font-black text-black bg-green-300 border-2 border-black rounded-none",
  badgeLive: "inline-block px-3 py-1 text-xs font-black text-white bg-red-500 border-2 border-black rounded-none",
  badgeUpcoming: "inline-block px-3 py-1 text-xs font-black text-black bg-gray-200 border-2 border-black rounded-none",
  badgeDelayed: "inline-block px-3 py-1 text-xs font-black text-black bg-amber-300 border-2 border-black rounded-none",
  linkPrimary: "font-black text-black underline",
  linkPrimaryHover: "hover:no-underline",
  card: "bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_#000]",
  cardTitle: "text-lg font-black text-black",
  qualifierBorder: "border-l-4 border-black",
  progressBarTrack: "w-full bg-gray-200 border-2 border-black h-4",
  progressBarFill: "h-4 bg-black transition-all",
};

// Version G: Glassmorphism — frosted panels, soft gradients
export const seasonPlayGlass: SeasonPlayTheme = {
  root: "space-y-8",
  tabsContainer: "mb-8 rounded-2xl overflow-hidden bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-semibold text-white bg-ntu-green/80 backdrop-blur border-b-2 border-ntu-green",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-medium text-gray-600 hover:bg-white/50 backdrop-blur border-b-2 border-transparent",
  infoBox: "rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 p-5 mb-6 shadow-lg",
  infoBoxText: "text-sm text-gray-700",
  tableWrapper: "rounded-2xl bg-white/70 backdrop-blur-xl border border-white/50 overflow-hidden shadow-lg",
  tableHeader: "bg-ntu-green/80 backdrop-blur text-white",
  tableHeaderCell: "px-5 py-3 text-left text-sm font-semibold",
  tableRowEven: "bg-white/40",
  tableRowOdd: "bg-white/60",
  tableCell: "px-5 py-3 text-sm",
  badgeCompleted: "inline-block px-3 py-1.5 text-xs font-medium text-green-800 bg-green-200/80 backdrop-blur rounded-full",
  badgeLive: "inline-block px-3 py-1.5 text-xs font-medium text-white bg-red-500/90 rounded-full animate-pulse",
  badgeUpcoming: "inline-block px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-200/80 rounded-full",
  badgeDelayed: "inline-block px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-200/80 rounded-full",
  linkPrimary: "font-semibold text-ntu-green",
  linkPrimaryHover: "hover:text-green-700 hover:underline",
  card: "rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-6 shadow-lg",
  cardTitle: "text-base font-semibold text-ntu-green",
  qualifierBorder: "border-l-4 border-ntu-green rounded-l-xl",
  progressBarTrack: "w-full bg-white/60 rounded-full h-2.5",
  progressBarFill: "h-2.5 rounded-full bg-ntu-green/80 transition-all",
};

// Version H: Split / Asymmetric — sidebar feel, clear structure
export const seasonPlaySplit: SeasonPlayTheme = {
  root: "space-y-6",
  tabsContainer: "mb-6 flex rounded-lg overflow-hidden border border-gray-300 bg-gray-100",
  tabActive: "flex-1 min-w-[120px] px-5 py-3 text-sm font-semibold text-white bg-gray-800 border-r border-gray-600 last:border-r-0",
  tabInactive: "flex-1 min-w-[120px] px-5 py-3 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border-r border-gray-200 last:border-r-0",
  infoBox: "bg-gray-50 border border-gray-200 border-l-4 border-gray-700 p-4 mb-6 rounded-r-lg",
  infoBoxText: "text-sm text-gray-700",
  tableWrapper: "rounded-lg border border-gray-300 overflow-hidden",
  tableHeader: "bg-gray-800 text-white",
  tableHeaderCell: "px-4 py-2.5 text-left text-xs font-semibold uppercase",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-gray-50",
  tableCell: "px-4 py-2.5 text-sm",
  badgeCompleted: "inline-block px-2 py-0.5 text-xs font-medium text-green-800 bg-green-100 border border-green-300 rounded",
  badgeLive: "inline-block px-2 py-0.5 text-xs font-medium text-red-800 bg-red-100 border border-red-300 rounded",
  badgeUpcoming: "inline-block px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded",
  badgeDelayed: "inline-block px-2 py-0.5 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded",
  linkPrimary: "font-semibold text-gray-800",
  linkPrimaryHover: "hover:underline hover:text-gray-600",
  card: "rounded-lg border border-gray-300 bg-white p-4",
  cardTitle: "text-sm font-semibold text-gray-800",
  qualifierBorder: "border-l-2 border-gray-700",
  progressBarTrack: "w-full bg-gray-200 rounded h-1.5",
  progressBarFill: "h-1.5 rounded bg-gray-700 transition-all",
};

// Version I: Dark / Arena — dark bg, bright accents
export const seasonPlayDark: SeasonPlayTheme = {
  root: "space-y-6 bg-gray-900",
  tabsContainer: "mb-6 bg-gray-800 rounded-xl overflow-hidden border border-gray-700",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-gray-900 bg-ntu-green border-b-2 border-amber-400",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-semibold text-gray-300 hover:bg-gray-700 border-b-2 border-transparent",
  infoBox: "bg-gray-800 border-l-4 border-ntu-green p-4 mb-6 rounded-r-xl border border-gray-700",
  infoBoxText: "text-sm text-gray-200",
  tableWrapper: "bg-gray-800 rounded-xl overflow-hidden border border-gray-700",
  tableHeader: "bg-ntu-green text-gray-900",
  tableHeaderCell: "px-4 py-3 text-left text-sm font-bold",
  tableRowEven: "bg-gray-800",
  tableRowOdd: "bg-gray-800/80",
  tableCell: "px-4 py-3 text-sm text-gray-200",
  badgeCompleted: "inline-block px-3 py-1 text-xs font-bold text-green-300 bg-green-900/50 rounded",
  badgeLive: "inline-block px-3 py-1 text-xs font-bold text-white bg-red-500 rounded animate-pulse",
  badgeUpcoming: "inline-block px-3 py-1 text-xs font-bold text-gray-400 bg-gray-700 rounded",
  badgeDelayed: "inline-block px-3 py-1 text-xs font-bold text-amber-300 bg-amber-900/50 rounded",
  linkPrimary: "font-bold text-ntu-green",
  linkPrimaryHover: "hover:text-amber-400 hover:underline",
  card: "bg-gray-800 rounded-xl border border-gray-700 p-6",
  cardTitle: "text-base font-bold text-ntu-green",
  qualifierBorder: "border-l-4 border-amber-400",
  progressBarTrack: "w-full bg-gray-700 rounded-full h-2",
  progressBarFill: "h-2 rounded-full bg-ntu-green transition-all",
};

// F spin-offs: Neobrutalist variants

// J: Neobrutalist + NTU Green (green instead of yellow)
export const seasonPlayBrutalGreen: SeasonPlayTheme = {
  root: "space-y-6",
  tabsContainer: "mb-6 bg-white border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-black text-white bg-ntu-green border-r-4 border-black last:border-r-0",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-black bg-green-100 hover:bg-green-200 border-r-4 border-black last:border-r-0",
  infoBox: "bg-green-100 border-4 border-black p-4 mb-6 shadow-[4px_4px_0_0_#000]",
  infoBoxText: "text-sm font-bold text-black",
  tableWrapper: "bg-white border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tableHeader: "bg-black text-white",
  tableHeaderCell: "px-4 py-3 text-left text-sm font-black uppercase",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-green-50",
  tableCell: "px-4 py-3 text-sm font-semibold",
  badgeCompleted: "inline-block px-3 py-1 text-xs font-black text-white bg-ntu-green border-2 border-black rounded-none",
  badgeLive: "inline-block px-3 py-1 text-xs font-black text-white bg-red-500 border-2 border-black rounded-none",
  badgeUpcoming: "inline-block px-3 py-1 text-xs font-black text-black bg-white border-2 border-black rounded-none",
  badgeDelayed: "inline-block px-3 py-1 text-xs font-black text-black bg-ntu-green border-2 border-black rounded-none",
  linkPrimary: "font-black text-ntu-green underline",
  linkPrimaryHover: "hover:no-underline",
  card: "bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_#000]",
  cardTitle: "text-lg font-black text-black",
  qualifierBorder: "border-l-4 border-ntu-green",
  progressBarTrack: "w-full bg-green-100 border-2 border-black h-4",
  progressBarFill: "h-4 bg-ntu-green transition-all",
};

// K: Rounded brutalist (same style, rounded corners)
export const seasonPlayBrutalRounded: SeasonPlayTheme = {
  root: "space-y-6",
  tabsContainer: "mb-6 bg-white rounded-2xl border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-black text-white bg-black border-r-4 border-black last:border-r-0 rounded-tl-2xl",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-black bg-yellow-300 hover:bg-yellow-200 border-r-4 border-black last:border-r-0",
  infoBox: "bg-yellow-300 rounded-2xl border-4 border-black p-4 mb-6 shadow-[4px_4px_0_0_#000]",
  infoBoxText: "text-sm font-bold text-black",
  tableWrapper: "bg-white rounded-2xl border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tableHeader: "bg-black text-white rounded-t-xl",
  tableHeaderCell: "px-4 py-3 text-left text-sm font-black uppercase",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-yellow-50",
  tableCell: "px-4 py-3 text-sm font-semibold",
  badgeCompleted: "inline-block px-3 py-1 text-xs font-black text-black bg-green-300 border-2 border-black rounded-xl",
  badgeLive: "inline-block px-3 py-1 text-xs font-black text-white bg-red-500 border-2 border-black rounded-xl",
  badgeUpcoming: "inline-block px-3 py-1 text-xs font-black text-black bg-gray-200 border-2 border-black rounded-xl",
  badgeDelayed: "inline-block px-3 py-1 text-xs font-black text-black bg-amber-300 border-2 border-black rounded-xl",
  linkPrimary: "font-black text-black underline",
  linkPrimaryHover: "hover:no-underline",
  card: "bg-white rounded-2xl border-4 border-black p-6 shadow-[6px_6px_0_0_#000]",
  cardTitle: "text-lg font-black text-black",
  qualifierBorder: "border-l-4 border-black rounded-l-xl",
  progressBarTrack: "w-full bg-gray-200 border-2 border-black h-4 rounded-full",
  progressBarFill: "h-4 bg-black rounded-full transition-all",
};

// L: Two-color only (black + yellow, no grays)
export const seasonPlayBrutalTwocolor: SeasonPlayTheme = {
  root: "space-y-6 bg-white",
  tabsContainer: "mb-6 bg-white border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-black text-black bg-yellow-300 border-r-4 border-black last:border-r-0",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-black text-black bg-white hover:bg-yellow-100 border-r-4 border-black last:border-r-0",
  infoBox: "bg-yellow-300 border-4 border-black p-4 mb-6 shadow-[4px_4px_0_0_#000]",
  infoBoxText: "text-sm font-black text-black",
  tableWrapper: "bg-white border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tableHeader: "bg-black text-yellow-300",
  tableHeaderCell: "px-4 py-3 text-left text-sm font-black uppercase",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-yellow-100",
  tableCell: "px-4 py-3 text-sm font-black text-black",
  badgeCompleted: "inline-block px-3 py-1 text-xs font-black text-black bg-yellow-300 border-2 border-black rounded-none",
  badgeLive: "inline-block px-3 py-1 text-xs font-black text-white bg-black border-2 border-black rounded-none",
  badgeUpcoming: "inline-block px-3 py-1 text-xs font-black text-black bg-white border-2 border-black rounded-none",
  badgeDelayed: "inline-block px-3 py-1 text-xs font-black text-black bg-yellow-300 border-2 border-black rounded-none",
  linkPrimary: "font-black text-black underline",
  linkPrimaryHover: "hover:no-underline",
  card: "bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_#000]",
  cardTitle: "text-lg font-black text-black",
  qualifierBorder: "border-l-4 border-black",
  progressBarTrack: "w-full bg-white border-2 border-black h-4",
  progressBarFill: "h-4 bg-black transition-all",
};

// M: Section accent colors (green / amber / red by feel — tabs get distinct colors)
export const seasonPlayBrutalSections: SeasonPlayTheme = {
  root: "space-y-6",
  tabsContainer: "mb-6 bg-white border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-black text-white bg-ntu-green border-r-4 border-black last:border-r-0",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-black bg-amber-50 hover:bg-amber-100 border-r-4 border-black last:border-r-0",
  infoBox: "bg-ntu-green border-4 border-black p-4 mb-6 shadow-[4px_4px_0_0_#000]",
  infoBoxText: "text-sm font-bold text-white",
  tableWrapper: "bg-white border-4 border-black overflow-hidden shadow-[6px_6px_0_0_#000]",
  tableHeader: "bg-black text-amber-300",
  tableHeaderCell: "px-4 py-3 text-left text-sm font-black uppercase",
  tableRowEven: "bg-white",
  tableRowOdd: "bg-red-50",
  tableCell: "px-4 py-3 text-sm font-semibold",
  badgeCompleted: "inline-block px-3 py-1 text-xs font-black text-black bg-green-300 border-2 border-black rounded-none",
  badgeLive: "inline-block px-3 py-1 text-xs font-black text-white bg-red-500 border-2 border-black rounded-none",
  badgeUpcoming: "inline-block px-3 py-1 text-xs font-black text-black bg-amber-200 border-2 border-black rounded-none",
  badgeDelayed: "inline-block px-3 py-1 text-xs font-black text-black bg-amber-300 border-2 border-black rounded-none",
  linkPrimary: "font-black text-ntu-green underline",
  linkPrimaryHover: "hover:no-underline",
  card: "bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_#000]",
  cardTitle: "text-lg font-black text-black",
  qualifierBorder: "border-l-4 border-ntu-green",
  progressBarTrack: "w-full bg-amber-100 border-2 border-black h-4",
  progressBarFill: "h-4 bg-ntu-green transition-all",
};

// N: Inverted brutalist (dark base, light panels)
export const seasonPlayBrutalInverted: SeasonPlayTheme = {
  root: "space-y-6 bg-gray-900",
  tabsContainer: "mb-6 bg-gray-900 rounded-xl overflow-hidden",
  tabActive: "flex-1 min-w-[140px] px-6 py-4 font-black text-gray-900 bg-white border-r-4 border-white last:border-r-0",
  tabInactive: "flex-1 min-w-[140px] px-6 py-4 font-bold text-white bg-gray-800 hover:bg-gray-700 border-r-4 border-gray-600 last:border-r-0",
  infoBox: "bg-gray-800 border-4 border-white p-4 mb-6 rounded-xl shadow-[4px_4px_0_0_rgba(255,255,255,0.4)]",
  infoBoxText: "text-sm font-bold text-white",
  tableWrapper: "bg-gray-800 border-4 border-white overflow-hidden rounded-xl shadow-[6px_6px_0_0_rgba(255,255,255,0.3)]",
  tableHeader: "bg-white text-gray-900",
  tableHeaderCell: "px-4 py-3 text-left text-sm font-black uppercase",
  tableRowEven: "bg-gray-800",
  tableRowOdd: "bg-gray-800/80",
  tableCell: "px-4 py-3 text-sm font-semibold text-white",
  badgeCompleted: "inline-block px-3 py-1 text-xs font-black text-gray-900 bg-ntu-green border-2 border-white rounded-none",
  badgeLive: "inline-block px-3 py-1 text-xs font-black text-white bg-red-500 border-2 border-white rounded-none",
  badgeUpcoming: "inline-block px-3 py-1 text-xs font-black text-white bg-gray-600 border-2 border-white rounded-none",
  badgeDelayed: "inline-block px-3 py-1 text-xs font-black text-gray-900 bg-amber-300 border-2 border-white rounded-none",
  linkPrimary: "font-black text-ntu-green underline",
  linkPrimaryHover: "hover:no-underline",
  card: "bg-gray-800 border-4 border-white p-6 rounded-xl shadow-[6px_6px_0_0_rgba(255,255,255,0.3)]",
  cardTitle: "text-lg font-black text-white",
  qualifierBorder: "border-l-4 border-ntu-green",
  progressBarTrack: "w-full bg-gray-700 border-2 border-white h-4 rounded-full",
  progressBarFill: "h-4 bg-ntu-green rounded-full transition-all",
};

export const seasonPlayThemes: Record<DesignVariant, SeasonPlayTheme> = {
  modern: seasonPlayModern,
  varsity: seasonPlayVarsity,
  dashboard: seasonPlayDashboard,
  editorial: seasonPlayEditorial,
  mobile: seasonPlayMobile,
  neobrutalist: seasonPlayNeobrutalist,
  glass: seasonPlayGlass,
  split: seasonPlaySplit,
  dark: seasonPlayDark,
  "brutal-green": seasonPlayBrutalGreen,
  "brutal-rounded": seasonPlayBrutalRounded,
  "brutal-twocolor": seasonPlayBrutalTwocolor,
  "brutal-sections": seasonPlayBrutalSections,
  "brutal-inverted": seasonPlayBrutalInverted,
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
