"use client";

import Link from "next/link";
import { COLOR_THEMES } from "./colorThemes";

export default function DesignCompareColorsPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/design-compare" className="text-sm text-gray-500 hover:text-ntu-green mb-4 inline-block">
          Back to Design Comparison
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Choose a Color Theme</h1>
        <p className="text-gray-600 mb-8">
          Click View demo to see the theme on a sample navbar, content, and footer. Pick one to apply to the site later.
        </p>
        <ul className="space-y-4">
          {COLOR_THEMES.map((theme) => (
            <li key={theme.id}>
              <Link
                href={`/design-compare/colors/${theme.id}`}
                className="block p-5 bg-white rounded-xl shadow border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-lg shrink-0 border border-gray-200"
                    style={{ backgroundColor: theme.primary }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-900">{theme.name}</span>
                    <span className="text-gray-500 ml-2 text-sm">/ {theme.nameZh}</span>
                    <p className="text-sm text-gray-500 mt-1">{theme.description}</p>
                    <p className="text-xs text-gray-400 mt-2">Primary: {theme.primary}</p>
                  </div>
                  <span className="text-ntu-green font-medium text-sm shrink-0">View demo</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
