"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";

interface RefereeAvailabilityRow {
  user_id: string;
  slot_start: string;
  slot_end: string;
}

interface RefereeSchedulingManagerProps {
  eventId: string;
  initialAvailability: RefereeAvailabilityRow[];
  candidateUserIds: string[];
  userLabelMap: Record<string, string>;
}

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const fromDatetimeLocal = (value: string) => {
  if (!value) return "";
  return new Date(value).toISOString();
};

export default function RefereeSchedulingManager({
  eventId,
  initialAvailability,
  candidateUserIds,
  userLabelMap,
}: RefereeSchedulingManagerProps) {
  const supabase = createClient();
  const [rows, setRows] = useState<RefereeAvailabilityRow[]>(initialAvailability);
  const [draft, setDraft] = useState({
    userId: candidateUserIds[0] ?? "",
    userIdManual: "",
    start: "",
    end: "",
  });
  const [saving, setSaving] = useState(false);

  const availableUsers = useMemo(() => {
    return candidateUserIds
      .map((id) => ({ id, label: userLabelMap[id] ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [candidateUserIds, userLabelMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, RefereeAvailabilityRow[]>();
    for (const row of rows) {
      if (!map.has(row.user_id)) map.set(row.user_id, []);
      map.get(row.user_id)!.push(row);
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
      );
    }
    return Array.from(map.entries()).sort((a, b) =>
      (userLabelMap[a[0]] ?? a[0]).localeCompare(userLabelMap[b[0]] ?? b[0])
    );
  }, [rows, userLabelMap]);

  const addAvailability = async () => {
    const userId = draft.userIdManual.trim() || draft.userId;
    if (!userId) return toast.error("Select or input a referee user ID.");
    if (!draft.start || !draft.end) return toast.error("Pick both start and end time.");
    const startIso = fromDatetimeLocal(draft.start);
    const endIso = fromDatetimeLocal(draft.end);
    if (!startIso || !endIso || new Date(startIso) >= new Date(endIso)) {
      return toast.error("End time must be after start time.");
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("referee_availability")
      .insert({
        event_id: eventId,
        user_id: userId,
        slot_start: startIso,
        slot_end: endIso,
      })
      .select("user_id, slot_start, slot_end")
      .single();
    setSaving(false);

    if (error || !data) {
      toast.error(error?.message || "Failed to add availability.");
      return;
    }

    setRows((prev) => [...prev, data]);
    setDraft((prev) => ({ ...prev, start: "", end: "", userIdManual: "" }));
    toast.success("Referee availability added.");
  };

  const removeAvailability = async (row: RefereeAvailabilityRow) => {
    const { error } = await supabase
      .from("referee_availability")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", row.user_id)
      .eq("slot_start", row.slot_start)
      .eq("slot_end", row.slot_end);
    if (error) {
      toast.error(error.message || "Failed to remove availability.");
      return;
    }
    setRows((prev) =>
      prev.filter(
        (item) =>
          !(
            item.user_id === row.user_id &&
            item.slot_start === row.slot_start &&
            item.slot_end === row.slot_end
          )
      )
    );
    toast.success("Availability removed.");
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Add Referee Availability</h2>
        <p className="mt-1 text-sm text-gray-600">
          Use this as your separate ref scheduling function. Refs in this list become selectable in Dispatch.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={draft.userId}
            onChange={(e) => setDraft((prev) => ({ ...prev, userId: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          >
            <option value="">Select existing user...</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={draft.userIdManual}
            onChange={(e) => setDraft((prev) => ({ ...prev, userIdManual: e.target.value }))}
            placeholder="Or input user_id manually"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />

          <input
            type="datetime-local"
            value={draft.start}
            onChange={(e) => setDraft((prev) => ({ ...prev, start: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />

          <input
            type="datetime-local"
            value={draft.end}
            onChange={(e) => setDraft((prev) => ({ ...prev, end: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ntu-green focus:outline-none focus:ring-2 focus:ring-ntu-green/20"
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={addAvailability}
            disabled={saving}
            className="rounded-lg bg-ntu-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add Availability"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Referee Schedule</h2>
        {grouped.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">No referee availability yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {grouped.map(([userId, items]) => (
              <div key={userId} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-sm font-semibold text-gray-800">
                  {userLabelMap[userId] ?? userId}
                </p>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={`${item.user_id}-${item.slot_start}-${item.slot_end}-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="text-gray-700">
                        {toDatetimeLocal(item.slot_start).replace("T", " ")} -{" "}
                        {toDatetimeLocal(item.slot_end).replace("T", " ")}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAvailability(item)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
