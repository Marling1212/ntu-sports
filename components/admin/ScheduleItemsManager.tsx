"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

interface ScheduleItem {
  id: string;
  event_id: string;
  day_number: number;
  day_title: string;
  location: string;
  order_number: number;
  group_name: string;
  round_name: string;
  match_count: number;
  scheduled_time: string;
}

interface ScheduleItemsManagerProps {
  eventId: string;
  initialScheduleItems: ScheduleItem[];
  initialScheduleNotes: string;
  initialScheduleUpdatedAt: string;
  initialContactInfo: string;
}

export default function ScheduleItemsManager({
  eventId,
  initialScheduleItems,
  initialScheduleNotes,
  initialScheduleUpdatedAt,
  initialContactInfo,
}: ScheduleItemsManagerProps) {
  const supabase = createClient();
  const { t } = useI18n();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(initialScheduleItems);
  const [scheduleNotes, setScheduleNotes] = useState<string>(initialScheduleNotes);
  const [scheduleUpdatedAt, setScheduleUpdatedAt] = useState<string>(initialScheduleUpdatedAt);
  const [contactInfo, setContactInfo] = useState<string>(initialContactInfo);

  const uniqueDays = useMemo(
    () => [...new Set(scheduleItems.map((s) => s.day_number))].sort((a, b) => a - b),
    [scheduleItems]
  );
  const maxDay = uniqueDays.length > 0 ? Math.max(...uniqueDays) : 0;

  const addDay = () => {
    const newDayNumber = maxDay + 1;
    const recentGroupName = scheduleItems.length > 0 ? scheduleItems[scheduleItems.length - 1].group_name : "";
    const recentLocation =
      scheduleItems.length > 0 ? scheduleItems[scheduleItems.length - 1].location : "國立台灣大學新生網球場（5-8場）";

    setScheduleItems([
      ...scheduleItems,
      {
        id: `temp-${Date.now()}`,
        event_id: eventId,
        day_number: newDayNumber,
        day_title: `第 ${newDayNumber} 天`,
        location: recentLocation,
        order_number: 1,
        group_name: recentGroupName,
        round_name: "",
        match_count: 0,
        scheduled_time: "",
      },
    ]);
  };

  const removeDay = async (dayNumber: number) => {
    if (!confirm(`確定要刪除第 ${dayNumber} 天的所有賽程嗎？`)) return;
    const itemsToDelete = scheduleItems.filter((s) => s.day_number === dayNumber && !s.id.startsWith("temp-"));
    for (const item of itemsToDelete) {
      await supabase.from("schedule_items").delete().eq("id", item.id);
    }
    setScheduleItems(scheduleItems.filter((s) => s.day_number !== dayNumber));
    toast.success(`第 ${dayNumber} 天已刪除`);
  };

  const updateDayInfo = (dayNumber: number, field: "day_title" | "location", value: string) => {
    setScheduleItems(scheduleItems.map((s) => (s.day_number === dayNumber ? { ...s, [field]: value } : s)));
  };

  const addScheduleItem = (dayNumber: number) => {
    const dayItems = scheduleItems.filter((s) => s.day_number === dayNumber);
    const newOrder = dayItems.length > 0 ? Math.max(...dayItems.map((s) => s.order_number)) + 1 : 1;
    const dayInfo = dayItems[0] || { day_title: `第 ${dayNumber} 天`, location: "國立台灣大學新生網球場（5-8場）" };
    const recentGroupName =
      dayItems.length > 0
        ? dayItems[dayItems.length - 1].group_name
        : scheduleItems.length > 0
          ? scheduleItems[scheduleItems.length - 1].group_name
          : "";

    setScheduleItems([
      ...scheduleItems,
      {
        id: `temp-${Date.now()}`,
        event_id: eventId,
        day_number: dayNumber,
        day_title: dayInfo.day_title,
        location: dayInfo.location,
        order_number: newOrder,
        group_name: recentGroupName,
        round_name: "",
        match_count: 0,
        scheduled_time: "",
      },
    ]);
  };

  const updateScheduleItem = (id: string, field: keyof ScheduleItem, value: string | number) => {
    setScheduleItems(scheduleItems.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const deleteScheduleItem = async (id: string) => {
    if (!id.startsWith("temp-")) {
      const { error } = await supabase.from("schedule_items").delete().eq("id", id);
      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }
    }
    setScheduleItems(scheduleItems.filter((s) => s.id !== id));
    toast.success("賽程項目已刪除");
  };

  const saveSchedule = async () => {
    try {
      await supabase.from("schedule_items").delete().eq("event_id", eventId);
      const itemsToInsert = scheduleItems
        .filter((s) => s.round_name.trim() !== "")
        .map((s) => ({
          event_id: eventId,
          day_number: s.day_number,
          day_title: s.day_title,
          location: s.location,
          order_number: s.order_number,
          group_name: s.group_name,
          round_name: s.round_name,
          match_count: s.match_count,
          scheduled_time: s.scheduled_time,
        }));

      if (itemsToInsert.length > 0) {
        const { error } = await supabase.from("schedule_items").insert(itemsToInsert);
        if (error) throw error;
      }

      const { error: notesError } = await supabase
        .from("events")
        .update({
          schedule_notes: scheduleNotes,
          schedule_updated_at: scheduleUpdatedAt,
          contact_info: contactInfo,
        })
        .eq("id", eventId);
      if (notesError) throw notesError;

      toast.success("比賽行程已保存！");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <section id="schedule-items" className="mt-8 scroll-mt-24 space-y-6">
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
        <h2 className="text-lg font-semibold text-amber-800">區塊二：新增比賽日與賽程說明</h2>
        <p className="text-sm text-amber-700 mt-1">這裡管理公開頁「規則與賽程時間」的賽程日程與說明文字。</p>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={saveSchedule}
          className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          💾 {t("admin.settings.saveSchedule")}
        </button>
        <button
          onClick={addDay}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          ➕ {t("admin.settings.addDay")}
        </button>
      </div>

      {uniqueDays.map((dayNumber) => {
        const dayItems = scheduleItems.filter((s) => s.day_number === dayNumber);
        const dayInfo = dayItems[0] || { day_title: `Day ${dayNumber}`, location: "" };
        return (
          <div key={dayNumber} className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-ntu-green">Day {dayNumber}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => addScheduleItem(dayNumber)}
                    className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    ➕ {t("admin.settings.addSchedule")}
                  </button>
                  <button
                    onClick={() => removeDay(dayNumber)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    🗑️ {t("admin.delete")}
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.settings.dayTitle")}</label>
                  <input
                    type="text"
                    value={dayInfo.day_title}
                    onChange={(e) => updateDayInfo(dayNumber, "day_title", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g. 2025/11/8 (Sat)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.settings.dayLocation")}</label>
                  <input
                    type="text"
                    value={dayInfo.location}
                    onChange={(e) => updateDayInfo(dayNumber, "location", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder={t("admin.settings.venue")}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {dayItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <input
                        type="text"
                        value={item.group_name}
                        onChange={(e) => updateScheduleItem(item.id, "group_name", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g. A"
                      />
                      <p className="text-xs text-gray-500 mt-1">{t("admin.settings.groupName")}</p>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={item.round_name}
                        onChange={(e) => updateScheduleItem(item.id, "round_name", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g. QF"
                      />
                      <p className="text-xs text-gray-500 mt-1">{t("admin.settings.roundName")}</p>
                    </div>
                    <div>
                      <input
                        type="number"
                        value={item.match_count}
                        onChange={(e) => updateScheduleItem(item.id, "match_count", parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="1"
                      />
                      <p className="text-xs text-gray-500 mt-1">{t("admin.settings.matchCount")}</p>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={item.scheduled_time}
                        onChange={(e) => updateScheduleItem(item.id, "scheduled_time", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder="e.g. NB 14:00"
                      />
                      <p className="text-xs text-gray-500 mt-1">{t("admin.settings.scheduledTime")}</p>
                    </div>
                    <button
                      onClick={() => deleteScheduleItem(item.id)}
                      className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 h-fit"
                    >
                      🗑️ {t("admin.delete")}
                    </button>
                  </div>
                </div>
              ))}

              {dayItems.length === 0 && <div className="text-center py-8 text-gray-500">{t("admin.settings.noScheduleYet")}</div>}
            </div>
          </div>
        );
      })}

      {uniqueDays.length === 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">尚未建立任何比賽日</p>
          <p className="text-gray-400 text-sm">請點擊上方「新增比賽日」按鈕開始建立賽程</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h3 className="text-2xl font-semibold text-ntu-green mb-6">{t("admin.settings.scheduleNotes")}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.settings.details")}</label>
            <textarea
              value={scheduleNotes}
              onChange={(e) => setScheduleNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-transparent"
              rows={3}
              placeholder={t("admin.settings.detailsPlaceholder")}
            />
            <p className="mt-1 text-sm text-gray-500">{t("admin.settings.markdownHint")}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.settings.lastUpdated")}</label>
            <input
              type="text"
              value={scheduleUpdatedAt}
              onChange={(e) => setScheduleUpdatedAt(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-transparent"
              placeholder="e.g. 2025/11/04"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("admin.settings.contactInfo")}</label>
            <textarea
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ntu-green focus:border-transparent"
              rows={2}
              placeholder={t("admin.settings.contactPlaceholder")}
            />
            <p className="mt-1 text-sm text-gray-500">{t("admin.settings.markdownHint")}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveSchedule}
          className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          💾 {t("admin.settings.saveSchedule")}
        </button>
      </div>
    </section>
  );
}
