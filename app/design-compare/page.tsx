"use client";

import Link from "next/link";

const VARIANTS = [
  { id: "modern", label: "A — Modern & Minimal", desc: "Clean lines, whitespace, typography-focused." },
  { id: "varsity", label: "B — High Energy / Varsity", desc: "Bold colors, gradients, badge-style (ESPN-like)." },
  { id: "dashboard", label: "C — Dashboard / Utility", desc: "Dense, tabular, desktop admin–focused." },
  { id: "editorial", label: "D — Editorial / Magazine", desc: "Big typography, feature-first, serious." },
  { id: "mobile", label: "E — Mobile-first / App-like", desc: "Large tap targets, rounded cards, phone-friendly." },
  { id: "neobrutalist", label: "F — Neobrutalist / Bold", desc: "Hard shadows, thick borders, high contrast." },
  { id: "glass", label: "G — Glassmorphism / Soft", desc: "Frosted panels, soft gradients, premium feel." },
  { id: "split", label: "H — Split / Asymmetric", desc: "Sidebar + main, clear browse vs. focus." },
  { id: "dark", label: "I — Dark / Arena", desc: "Dark background, bright accents, game-day vibe." },
  { id: "brutal-green", label: "J — Brutal + NTU Green", desc: "Same as F, green instead of yellow. More official." },
  { id: "brutal-rounded", label: "K — Rounded Brutalist", desc: "Same style as F, with rounded corners. Friendlier." },
  { id: "brutal-twocolor", label: "L — Two-Color Only", desc: "Black + yellow only. No grays. Poster-like." },
  { id: "brutal-sections", label: "M — Brutal + Section Accents", desc: "Green / amber / red by section. Clear hierarchy." },
  { id: "brutal-inverted", label: "N — Inverted Brutalist", desc: "Dark base, white/cream panels, hard light shadows." },
  { id: "retro", label: "O — Retro / 80s", desc: "Neon cyan & magenta, synthwave, dark background." },
  { id: "newspaper", label: "P — Newspaper / Print", desc: "Serif, black & white, column feel." },
  { id: "terminal", label: "Q — Terminal / Code", desc: "Monospace, green/amber on dark, CLI vibe." },
  { id: "comic", label: "R — Comic / Manga", desc: "Bold outlines, speech-bubble, primary colors." },
  { id: "luxury", label: "S — Luxury / Premium", desc: "Gold, cream, serif, prestige." },
  { id: "zen", label: "T — Zen / Minimal Japanese", desc: "Lots of space, one accent, restrained." },
];

export default function DesignCompareIndexPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Design System Comparison</h1>
        <p className="text-gray-600 mb-8">
          Choose one to view at full width — no squeezing.
        </p>
        <div className="mb-8 p-5 bg-white rounded-xl shadow border-2 border-ntu-green">
          <Link
            href="/design-compare/colors"
            className="block"
          >
            <span className="font-semibold text-gray-900">Color themes</span>
            <p className="text-sm text-gray-500 mt-1">Pick a site color: current green, forest, ocean, amber, or slate. View demos and choose one.</p>
          </Link>
        </div>
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
