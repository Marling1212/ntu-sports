"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";

interface RefereeRow {
  id: string;
  event_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  linked_player_id: string | null;
  note: string | null;
}

interface CandidateIdentity {
  user_id: string;
  linked_player_id: string | null;
  name: string;
  email: string | null;
  teams: string[];
}

interface ManualPlayerOption {
  player_id: string;
  name: string;
  email: string | null;
}

export default function RefereeOnboardingWizard({
  eventId,
  initialReferees,
  candidateIdentities,
  manualPlayerOptions,
}: {
  eventId: string;
  initialReferees: RefereeRow[];
  candidateIdentities: CandidateIdentity[];
  manualPlayerOptions: ManualPlayerOption[];
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<RefereeRow[]>(initialReferees);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [matches, setMatches] = useState<CandidateIdentity[]>([]);
  const [decision, setDecision] = useState<string>("");
  const [manualPlayerId, setManualPlayerId] = useState("");
  const [manualPlayerQuery, setManualPlayerQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const existingUserIds = useMemo(() => new Set(rows.map((r) => r.user_id)), [rows]);
  const filteredManualPlayers = useMemo(() => {
    const q = manualPlayerQuery.trim().toLowerCase();
    if (!q) return manualPlayerOptions.slice(0, 40);
    return manualPlayerOptions
      .filter((p) => `${p.name} ${p.email || ""}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [manualPlayerOptions, manualPlayerQuery]);

  const runCheck = () => {
    const q = name.trim().toLowerCase();
    if (!q) return toast.error("Enter a name first.");
    const found = candidateIdentities
      .filter((c) => !existingUserIds.has(c.user_id))
      .filter((c) => {
        const target = [
          c.name,
          c.email || "",
          c.user_id,
          ...c.teams,
        ]
          .join(" ")
          .toLowerCase();
        return target.includes(q);
      })
      .slice(0, 8);
    setMatches(found);
    setDecision(found.length === 0 ? "new" : "");
  };

  const completeOnboarding = async () => {
    if (!name.trim()) return toast.error("Name is required.");
    setSaving(true);

    if (decision && decision !== "new") {
      const chosen = matches.find((m) => m.user_id === decision);
      if (!chosen) {
        setSaving(false);
        return toast.error("Please choose a valid linked profile.");
      }
      const { data, error } = await supabase
        .from("event_referees")
        .insert({
          event_id: eventId,
          user_id: chosen.user_id,
          linked_player_id: chosen.linked_player_id,
          display_name: chosen.name,
          email: chosen.email,
          note: note.trim() || null,
        })
        .select("id, event_id, user_id, display_name, email, linked_player_id, note")
        .single();
      setSaving(false);
      if (error || !data) return toast.error(error?.message || "Failed to link referee.");
      setRows((prev) => [...prev, data]);
      setName("");
      setEmail("");
      setNote("");
      setMatches([]);
      setDecision("");
      return toast.success("Linked to existing player identity.");
    }

    const response = await fetch(`/api/admin/events/${eventId}/referees/external`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        note,
        linkedPlayerId: manualPlayerId || null,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok || !payload?.referee) {
      return toast.error(payload?.message || "Failed to create new referee.");
    }
    setRows((prev) => [...prev, payload.referee]);
    setName("");
    setEmail("");
    setNote("");
    setMatches([]);
    setDecision("");
    setManualPlayerId("");
    setManualPlayerQuery("");
    toast.success("Created new referee identity.");
  };

  const removeReferee = async (id: string) => {
    const { error } = await supabase.from("event_referees").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Referee removed.");
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Onboard Referee (Dummy-Proof)</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter name. We check matching player identities and ask you whether it is the same person.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional, for new person)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={runCheck}
            className="rounded-lg border border-ntu-green px-4 py-2 text-sm font-semibold text-ntu-green hover:bg-ntu-green hover:text-white"
          >
            Check Matching Players
          </button>
          <button
            type="button"
            onClick={completeOnboarding}
            disabled={saving || (!decision && matches.length > 0)}
            className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Complete Onboarding"}
          </button>
        </div>

        {matches.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 text-sm font-medium text-amber-900">
              We found possible same-person matches in team rosters. Is this the same person?
            </p>
            <div className="space-y-2">
              {matches.map((m) => (
                <label key={m.user_id} className="flex cursor-pointer items-start gap-2 rounded border border-amber-200 bg-white p-2">
                  <input
                    type="radio"
                    name="identity-choice"
                    checked={decision === m.user_id}
                    onChange={() => setDecision(m.user_id)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-gray-800">
                    <span className="block font-medium">{m.name}</span>
                    <span className="block text-xs text-gray-600">
                      Teams: {m.teams.join(", ") || "-"} · user {m.user_id.slice(0, 8)}
                    </span>
                  </span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 rounded border border-amber-200 bg-white p-2">
                <input
                  type="radio"
                  name="identity-choice"
                  checked={decision === "new"}
                  onChange={() => setDecision("new")}
                />
                <span className="text-sm text-gray-800">Not the same person — create new referee identity.</span>
              </label>
            </div>
          </div>
        )}

        {matches.length === 0 && decision === "new" && (
          <div className="mt-3 space-y-3 rounded-lg bg-emerald-50 px-3 py-3">
            <p className="text-sm text-emerald-800">
              No matching player found automatically. You can still pick a player manually before creating this referee.
            </p>
            <input
              type="text"
              value={manualPlayerQuery}
              onChange={(e) => setManualPlayerQuery(e.target.value)}
              placeholder="Search players manually..."
              className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
            />
            <select
              value={manualPlayerId}
              onChange={(e) => setManualPlayerId(e.target.value)}
              className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
            >
              <option value="">No linked player (external only)</option>
              {filteredManualPlayers.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                  {p.name}
                  {p.email ? ` · ${p.email}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Current Referees</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Linked Player Profile</th>
                <th className="px-3 py-2 text-right font-medium">Remove</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    No referees yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {row.display_name || `User ${row.user_id.slice(0, 8)}`}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{row.email || "-"}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {row.linked_player_id ? `Linked (${row.linked_player_id.slice(0, 8)})` : "External / None"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeReferee(row.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
