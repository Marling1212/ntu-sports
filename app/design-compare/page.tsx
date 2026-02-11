"use client";

import Link from "next/link";

const VARIANTS = [
  { id: "modern", label: "A — Modern & Minimal", desc: "Clean lines, whitespace, typography-focused." },
  { id: "varsity", label: "B — High Energy / Varsity", desc: "Bold colors, gradients, badge-style (ESPN-like)." },
  { id: "dashboard", label: "C — Dashboard / Utility", desc: "Dense, tabular, desktop admin–focused." },
];

export default function DesignCompareIndexPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Design System Comparison</h1>
        <p className="text-gray-600 mb-8">
          Choose one to view at full width — no squeezing.
        </p>
        <ul className="space-y-4">
          {VARIANTS.map(({ id, label, desc }) => (
            <li key={id}>
              <Link
                href={`/design-compare/${id}`}
                className="block p-5 bg-white rounded-xl shadow border border-gray-200 hover:border-ntu-green hover:shadow-md transition-all"
              >
                <span className="font-semibold text-gray-900">{label}</span>
                <p className="text-sm text-gray-500 mt-1">{desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
