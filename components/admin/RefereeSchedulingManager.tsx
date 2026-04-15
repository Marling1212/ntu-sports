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
interface SlotGroup {
  key: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  template_ids: string[];
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

  const groupedSlots = useMemo(() => {
    const groupMap = new Map<string, SlotGroup>();
    const sorted = [...slotTemplates].sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      if (a.start_time !== b.start_time) return a.start_time.localeCompare(b.start_time);
      return a.end_time.localeCompare(b.end_time);
    });
    for (const slot of sorted) {
      const key = `${slot.day_of_week}__${slot.start_time}__${slot.end_time}`;
      const prev = groupMap.get(key);
      if (!prev) {
        groupMap.set(key, {
          key,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          template_ids: [slot.id],
        });
      } else {
        prev.template_ids.push(slot.id);
      }
    }
    return Array.from(groupMap.values());
  }, [slotTemplates]);

  const toggleCell = async (userId: string, group: SlotGroup) => {
    const key = `${userId}::${group.key}`;
    setSavingKey(key);

    const activeTemplateIds = group.template_ids.filter((templateId) =>
      byUserTemplate.has(`${userId}::${templateId}`)
    );
    const allActive = activeTemplateIds.length === group.template_ids.length;

    if (allActive) {
      const { error } = await supabase
        .from("referee_availability_templates")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .in("slot_template_id", group.template_ids);
      setSavingKey("");
      if (error) return toast.error(error.message || "Failed to update availability.");
      setRows((prev) =>
        prev.filter((r) => !(r.user_id === userId && group.template_ids.includes(r.slot_template_id)))
      );
      return;
    }

    const missingTemplateIds = group.template_ids.filter(
      (templateId) => !byUserTemplate.has(`${userId}::${templateId}`)
    );
    if (missingTemplateIds.length === 0) {
      setSavingKey("");
      return;
    }
    const { data, error } = await supabase
      .from("referee_availability_templates")
      .insert(
        missingTemplateIds.map((slotTemplateId) => ({
          event_id: eventId,
          user_id: userId,
          slot_template_id: slotTemplateId,
        }))
      )
      .select("id, user_id, slot_template_id");
    setSavingKey("");
    if (error || !data) return toast.error(error?.message || "Failed to update availability.");
    setRows((prev) => [...prev, ...data]);
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ntu-green">Referee Availability Matrix</h2>
        <p className="mt-1 text-sm text-gray-600">
          Click cells to toggle availability. Duplicate slots with the same day and time are merged into one column.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="px-3 py-2 font-medium">Referee</th>
                {groupedSlots.map((group) => (
                  <th key={group.key} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                    <div>{WEEKDAYS[group.day_of_week] ?? group.day_of_week}</div>
                    <div className="text-xs text-gray-500">
                      {hhmm(group.start_time)}-{hhmm(group.end_time)}
                      {group.template_ids.length > 1 ? ` (${group.template_ids.length} slots)` : ""}
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
                  {groupedSlots.map((group) => {
                    const key = `${userId}::${group.key}`;
                    const activeCount = group.template_ids.filter((templateId) =>
                      byUserTemplate.has(`${userId}::${templateId}`)
                    ).length;
                    const active = activeCount === group.template_ids.length;
                    const loading = savingKey === key;
                    return (
                      <td key={group.key} className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCell(userId, group)}
                          disabled={loading}
                          className={`h-7 w-7 rounded border text-xs font-bold transition-colors ${
                            active
                              ? "border-ntu-green bg-ntu-green text-white"
                              : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                          } ${loading ? "opacity-60" : ""}`}
                          title={
                            active
                              ? "Available"
                              : activeCount > 0
                                ? "Partially available across duplicate slots"
                                : "Not available"
                          }
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
