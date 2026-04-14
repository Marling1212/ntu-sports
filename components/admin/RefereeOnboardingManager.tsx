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

interface CandidateProfile {
  user_id: string;
  player_id: string;
  name: string;
  email: string | null;
}

export default function RefereeOnboardingManager({
  eventId,
  initialReferees,
  candidateProfiles,
}: {
  eventId: string;
  initialReferees: RefereeRow[];
  candidateProfiles: CandidateProfile[];
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<RefereeRow[]>(initialReferees);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"internal" | "external">("internal");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CandidateProfile | null>(null);
  const [external, setExternal] = useState({ name: "", email: "", note: "" });
  const [saving, setSaving] = useState(false);

  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const existing = new Set(rows.map((r) => r.user_id));
    return candidateProfiles
      .filter((p) => !existing.has(p.user_id))
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.user_id.toLowerCase().includes(q) ||
          (p.email || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 30);
  }, [query, candidateProfiles, rows]);

  const addInternalReferee = async () => {
    if (!selected) return toast.error("Please select a player profile.");
    setSaving(true);
    const { data, error } = await supabase
      .from("event_referees")
      .insert({
        event_id: eventId,
        user_id: selected.user_id,
        linked_player_id: selected.player_id,
        display_name: selected.name,
        email: selected.email,
      })
      .select("id, event_id, user_id, display_name, email, linked_player_id, note")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message || "Failed to grant referee status.");
      return;
    }
    setRows((prev) => [...prev, data]);
    setModalOpen(false);
    setSelected(null);
    setQuery("");
    toast.success("Referee status granted.");
  };

  const addExternalReferee = async () => {
    if (!external.name.trim() || !external.email.trim()) {
      return toast.error("Name and email are required.");
    }
    setSaving(true);
    const response = await fetch(`/api/admin/events/${eventId}/referees/external`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(external),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok || !payload?.referee) {
      toast.error(payload?.message || "Failed to add external referee.");
      return;
    }
    setRows((prev) => [...prev, payload.referee]);
    setModalOpen(false);
    setExternal({ name: "", email: "", note: "" });
    toast.success("External referee added.");
  };

  const removeReferee = async (id: string) => {
    const { error } = await supabase.from("event_referees").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Failed to remove referee.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Referee removed.");
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ntu-green">Referee Directory</h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage officiating staff and identity links for conflict-proof dispatching.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Add / Link Referee
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Linked Player Profile</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    No referees yet. Click &quot;Add / Link Referee&quot; to start onboarding.
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Referee</h3>
              <button onClick={() => setModalOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Close
              </button>
            </div>

            <div className="border-b border-gray-100 px-5 pt-4">
              <div className="flex gap-2">
                <button
                  className={`rounded-t-lg px-3 py-2 text-sm font-medium ${tab === "internal" ? "bg-ntu-green text-white" : "bg-gray-100 text-gray-700"}`}
                  onClick={() => setTab("internal")}
                >
                  Link Existing Player
                </button>
                <button
                  className={`rounded-t-lg px-3 py-2 text-sm font-medium ${tab === "external" ? "bg-ntu-green text-white" : "bg-gray-100 text-gray-700"}`}
                  onClick={() => setTab("external")}
                >
                  Add External Referee
                </button>
              </div>
            </div>

            <div className="p-5">
              {tab === "internal" ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, student id, email, or user_id..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                  />
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                    {filteredCandidates.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">No matching player profile found.</p>
                    ) : (
                      filteredCandidates.map((candidate) => (
                        <button
                          key={`${candidate.user_id}-${candidate.player_id}`}
                          type="button"
                          onClick={() => setSelected(candidate)}
                          className={`flex w-full items-start justify-between border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-50 ${
                            selected?.player_id === candidate.player_id ? "bg-emerald-50" : ""
                          }`}
                        >
                          <span>
                            <span className="block font-medium text-gray-800">{candidate.name}</span>
                            <span className="block text-xs text-gray-500">
                              {candidate.email || "No email"} · user {candidate.user_id.slice(0, 8)}
                            </span>
                          </span>
                          <span className="text-xs text-gray-500">{candidate.player_id.slice(0, 8)}</span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addInternalReferee}
                      disabled={saving || !selected}
                      className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Grant Referee Status"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={external.name}
                    onChange={(e) => setExternal((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                  />
                  <input
                    type="email"
                    value={external.email}
                    onChange={(e) => setExternal((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                  />
                  <input
                    type="text"
                    value={external.note}
                    onChange={(e) => setExternal((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="Note (optional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addExternalReferee}
                      disabled={saving}
                      className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Create External Referee"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
