"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";

interface EventRefereeRow {
  id: string;
  event_id: string;
  user_id: string;
  display_name: string | null;
  note: string | null;
}

export default function RefereeDirectoryManager({
  eventId,
  initialReferees,
}: {
  eventId: string;
  initialReferees: EventRefereeRow[];
}) {
  const supabase = createClient();
  const [referees, setReferees] = useState<EventRefereeRow[]>(initialReferees);
  const [draft, setDraft] = useState({ userId: "", displayName: "", note: "" });
  const [saving, setSaving] = useState(false);

  const addReferee = async () => {
    if (!draft.userId.trim()) return toast.error("Please enter user_id.");
    setSaving(true);
    const { data, error } = await supabase
      .from("event_referees")
      .insert({
        event_id: eventId,
        user_id: draft.userId.trim(),
        display_name: draft.displayName.trim() || null,
        note: draft.note.trim() || null,
      })
      .select("id, event_id, user_id, display_name, note")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message || "Failed to create referee.");
      return;
    }
    setReferees((prev) => [...prev, data]);
    setDraft({ userId: "", displayName: "", note: "" });
    toast.success("Referee created.");
  };

  const removeReferee = async (id: string) => {
    const { error } = await supabase.from("event_referees").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Failed to remove referee.");
      return;
    }
    setReferees((prev) => prev.filter((r) => r.id !== id));
    toast.success("Referee removed.");
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Create Referee</h2>
        <p className="mt-1 text-sm text-gray-600">
          Add referee accounts here first. Then use Referee Scheduling and Dispatch.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            value={draft.userId}
            onChange={(e) => setDraft((prev) => ({ ...prev, userId: e.target.value }))}
            placeholder="Referee user_id (UUID)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <input
            type="text"
            value={draft.displayName}
            onChange={(e) => setDraft((prev) => ({ ...prev, displayName: e.target.value }))}
            placeholder="Display name (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
          <input
            type="text"
            value={draft.note}
            onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Note (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={addReferee}
            disabled={saving}
            className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create Ref"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Referee Directory</h2>
        {referees.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No referees yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="px-3 py-2 font-medium">Display Name</th>
                  <th className="px-3 py-2 font-medium">User ID</th>
                  <th className="px-3 py-2 font-medium">Note</th>
                  <th className="px-3 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {referees.map((referee) => (
                  <tr key={referee.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-3 py-2 font-medium text-gray-800">
                      {referee.display_name || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{referee.user_id}</td>
                    <td className="px-3 py-2 text-gray-600">{referee.note || "-"}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeReferee(referee.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
