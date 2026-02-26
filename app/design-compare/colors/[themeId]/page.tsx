"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { getColorTheme } from "../colorThemes";

export default function ColorThemeDemoPage() {
  const params = useParams();
  const router = useRouter();
  const themeId = (params?.themeId as string) || "";
  const theme = getColorTheme(themeId);

  if (!theme) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Theme not found.</p>
          <Link href="/design-compare/colors" className="text-ntu-green underline">
            Back to color themes
          </Link>
        </div>
      </div>
    );
  }

  const vars = {
    "--color-primary": theme.primary,
    "--color-primary-hover": theme.primaryHover,
    "--color-surface": theme.surface,
    "--color-surface-footer": theme.footerStart,
    "--color-surface-footer-end": theme.footerEnd,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen" style={vars}>
      {/* Mock navbar */}
      <header
        className="text-white shadow-lg sticky top-0 z-50"
        style={{
          background: `linear-gradient(to right, ${theme.footerStart}, ${theme.footerEnd})`,
        }}
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold">🏆 NTU Sports</span>
          <span className="text-sm opacity-90">Color demo: {theme.name}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8" style={{ backgroundColor: theme.surface }}>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link href="/design-compare/colors" className="text-sm text-gray-500 hover:underline">
            ← All themes
          </Link>
          <span className="text-gray-400">|</span>
          <span className="font-medium text-gray-700">{theme.name} / {theme.nameZh}</span>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2" style={{ color: theme.primary }}>
            Sample Event Title
          </h1>
          <p className="text-gray-600 mb-4">
            This is how headings, buttons, and the footer look with this theme. If you like it, we can apply it to the whole site.
          </p>
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: theme.primary }}
          >
            Sample Button
          </button>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden mb-6">
          <div
            className="px-4 py-3 text-white font-semibold"
            style={{ backgroundColor: theme.primary }}
          >
            Table header (e.g. Standings)
          </div>
          <table className="min-w-full">
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-gray-50/50"><td className="px-4 py-3 text-sm">Row 1</td></tr>
              <tr><td className="px-4 py-3 text-sm">Row 2</td></tr>
              <tr className="bg-gray-50/50"><td className="px-4 py-3 text-sm">Row 3</td></tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm text-gray-500 mb-8">
          Footer preview below. Tell us which theme you prefer via the Feedback link on the real site.
        </p>
      </main>

      {/* Mock footer */}
      <footer
        className="text-white py-6 mt-auto"
        style={{
          background: `linear-gradient(to right, ${theme.footerStart}, ${theme.footerEnd})`,
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-90">© NTU Sports — Color demo</p>
          <p className="text-xs opacity-75 mt-1">
            <Link href="/design-compare/colors" className="underline hover:opacity-100">
              Choose another theme
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
