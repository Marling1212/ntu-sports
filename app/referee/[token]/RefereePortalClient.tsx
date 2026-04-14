"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { DRAW_WINNER_ID } from "@/lib/constants/matchConstants";
import { updateRefereeMatchResult } from "./actions";

interface MatchRow {
  id: string;
  round: number;
  match_number: number;
  status: string;
  scheduled_time: string | null;
  score1: string | null;
  score2: string | null;
  winner_id: string | null;
  player1: { id: string; name: string } | null;
  player2: { id: string; name: string } | null;
}

export default function RefereePortalClient({
  token,
  matches,
}: {
  token: string;
  matches: MatchRow[];
}) {
  const [savingId, setSavingId] = useState<string>("");
  const [formByMatch, setFormByMatch] = useState<Record<string, { score1: string; score2: string; winner_id: string; status: string }>>(
    Object.fromEntries(
      matches.map((m) => [
        m.id,
        {
          score1: m.score1 ?? "",
          score2: m.score2 ?? "",
          winner_id:
            m.status === "completed" && !m.winner_id && m.score1 && m.score2 && m.score1 === m.score2
              ? DRAW_WINNER_ID
              : m.winner_id ?? "",
          status: m.status || "upcoming",
        },
      ])
    )
  );

  const setField = (matchId: string, key: "score1" | "score2" | "winner_id" | "status", value: string) => {
    setFormByMatch((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ?? { score1: "", score2: "", winner_id: "", status: "upcoming" }),
        [key]: value,
      },
    }));
  };

  const saveMatch = async (matchId: string) => {
    const form = formByMatch[matchId];
    if (!form) return;
    setSavingId(matchId);
    const result = await updateRefereeMatchResult(token, matchId, form);
    setSavingId("");
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Match updated.");
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />
      {matches.map((match) => {
        const form = formByMatch[match.id];
        return (
          <section key={match.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Round {match.round} · Match {match.match_number}
                </h3>
                <p className="text-sm text-gray-600">
                  {match.player1?.name ?? "TBD"} vs {match.player2?.name ?? "TBD"}
                </p>
                <p className="text-xs text-gray-500">
                  {match.scheduled_time ? new Date(match.scheduled_time).toLocaleString() : "Unscheduled"}
                </p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{match.status}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                type="text"
                value={form?.score1 ?? ""}
                onChange={(e) => setField(match.id, "score1", e.target.value)}
                placeholder="Score 1"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
              />
              <input
                type="text"
                value={form?.score2 ?? ""}
                onChange={(e) => setField(match.id, "score2", e.target.value)}
                placeholder="Score 2"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
              />
              <select
                value={form?.winner_id ?? ""}
                onChange={(e) => setField(match.id, "winner_id", e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
              >
                <option value="">No winner</option>
                <option value={DRAW_WINNER_ID}>Draw</option>
                {match.player1 && <option value={match.player1.id}>{match.player1.name}</option>}
                {match.player2 && <option value={match.player2.id}>{match.player2.name}</option>}
              </select>
              <select
                value={form?.status ?? "upcoming"}
                onChange={(e) => setField(match.id, "status", e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
              >
                <option value="upcoming">upcoming</option>
                <option value="live">live</option>
                <option value="completed">completed</option>
                <option value="delayed">delayed</option>
              </select>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => saveMatch(match.id)}
                disabled={savingId === match.id}
                className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {savingId === match.id ? "Saving..." : "Save Match"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
