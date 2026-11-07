"use client";

import { useState } from "react";
import { Player } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
import GenerateBracket from "@/components/admin/GenerateBracket";
import ManualBracketEditor from "@/components/admin/ManualBracketEditor";

interface SingleEliminationBracketManagerProps {
  eventId: string;
  players: Player[];
  defaultDivisionId?: string | null;
}

export default function SingleEliminationBracketManager({
  eventId,
  players,
  defaultDivisionId,
}: SingleEliminationBracketManagerProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"auto" | "manual">("auto");

  return (
    <div className="space-y-6 mt-8">
      {/* Segmented Mode Switcher */}
      <div className="bg-gray-100 p-1.5 rounded-xl flex max-w-md mx-auto shadow-inner border border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("auto")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 ${
            activeTab === "auto"
              ? "bg-white text-ntu-green shadow-sm ring-1 ring-black/5"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {t('admin.bracketManager.autoTab')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 ${
            activeTab === "manual"
              ? "bg-white text-ntu-green shadow-sm ring-1 ring-black/5"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {t('admin.bracketManager.manualTab')}
        </button>
      </div>

      {activeTab === "auto" ? (
        <div id="generate-bracket" className="scroll-mt-24">
          <GenerateBracket
            eventId={eventId}
            players={players || []}
            defaultDivisionId={defaultDivisionId}
          />
        </div>
      ) : (
        <div id="manual-bracket" className="scroll-mt-24">
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              {t('admin.bracketManager.manualNotice')}
            </p>
          </div>
          <ManualBracketEditor
            eventId={eventId}
            players={players || []}
            defaultDivisionId={defaultDivisionId}
          />
        </div>
      )}
    </div>
  );
}

