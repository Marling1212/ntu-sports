"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";

interface RefereeAvailabilityRow {
  id: string;
  user_id: string;
  slot_template_id: string;
}

interface SlotTemplate {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  code?: string | null;
}

interface RefereeSchedulingManagerProps {
  eventId: string;
  initialAvailability: RefereeAvailabilityRow[];
  slotTemplates: SlotTemplate[];
  candidateUserIds: string[];
  userLabelMap: Record<string, string>;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hhmm = (t: string) => t.slice(0, 5);

export default function RefereeSchedulingManager({
  eventId,
  initialAvailability,
  slotTemplates,
  candidateUserIds,
  userLabelMap,
}: RefereeSchedulingManagerProps) {
  const supabase = createClient();
  const [rows, setRows] = useState<RefereeAvailabilityRow[]>(initialAvailability);
  const [savingKey, setSavingKey] = useState<string>("");

  const availableUsers = useMemo(() => {
    return candidateUserIds
      .map((id) => ({ id, label: userLabelMap[id] ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [candidateUserIds, userLabelMap]);

  const byUserTemplate = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) set.add(`${row.user_id}::${row.slot_template_id}`);
    return set;
  }, [rows]);

  const sortedUsers = useMemo(
    () =>
      [...candidateUserIds].sort((a, b) =>
        (userLabelMap[a] ?? a).localeCompare(userLabelMap[b] ?? b)
      ),
    [candidateUserIds, userLabelMap]
  );

  const sortedTemplates = useMemo(
    () =>
      [...slotTemplates].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.start_time.localeCompare(b.start_time);
      }),
    [slotTemplates]
  );

  const toggleCell = async (userId: string, template: SlotTemplate) => {
    const key = `${userId}::${template.id}`;
    setSavingKey(key);
    if (byUserTemplate.has(key)) {
      const { error } = await supabase
        .from("referee_availability_templates")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .eq("slot_template_id", template.id);
      setSavingKey("");
      if (error) return toast.error(error.message || "Failed to update availability.");
      setRows((prev) => prev.filter((r) => !(r.user_id === userId && r.slot_template_id === template.id)));
      return;
    }

    const { data, error } = await supabase
      .from("referee_availability_templates")
      .insert({
        event_id: eventId,
        user_id: userId,
        slot_template_id: template.id,
      })
      .select("id, user_id, slot_template_id")
      .single();
    setSavingKey("");
    if (error || !data) return toast.error(error?.message || "Failed to update availability.");
    setRows((prev) => [...prev, data]);
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Referee Availability Matrix</h2>
        <p className="mt-1 text-sm text-gray-600">
          Click cells to toggle availability. Columns are pulled from Scheduling slot templates.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-3 py-2 font-medium">Referee</th>
                {sortedTemplates.map((tpl) => (
                  <th key={tpl.id} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                    <div>{WEEKDAYS[tpl.day_of_week] ?? tpl.day_of_week}</div>
                    <div className="text-xs text-gray-500">
                      {hhmm(tpl.start_time)}-{hhmm(tpl.end_time)}
                      {tpl.code ? ` (${tpl.code})` : ""}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((userId) => (
                <tr key={userId} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                    {userLabelMap[userId] ?? userId}
                  </td>
                  {sortedTemplates.map((tpl) => {
                    const key = `${userId}::${tpl.id}`;
                    const active = byUserTemplate.has(key);
                    const loading = savingKey === key;
                    return (
                      <td key={tpl.id} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCell(userId, tpl)}
                          disabled={loading}
                          className={`h-7 w-7 rounded border text-xs font-bold transition-colors ${
                            active
                              ? "border-ntu-green bg-ntu-green text-white"
                              : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                          } ${loading ? "opacity-60" : ""}`}
                          title={active ? "Available" : "Not available"}
                        >
                          {active ? "O" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
