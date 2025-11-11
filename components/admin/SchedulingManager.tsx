"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  EventCourt,
  EventSlot,
  Player,
  TeamBlackout,
} from "@/types/database";

interface SchedulingManagerProps {
  eventId: string;
  initialCourts: EventCourt[];
  initialSlots: (EventSlot & { court?: EventCourt | null })[];
  initialBlackouts: (TeamBlackout & { player?: Player | null })[];
  players: Player[];
  initialBlackoutLimit?: number | null;
}

interface SlotFormState {
  date: string;
  start: string;
  end: string;
  courtId: string;
  capacity: string;
  notes: string;
}

interface CourtFormState {
  name: string;
  surface: string;
  notes: string;
}

interface BlackoutFormState {
  playerId: string;
  start: string;
  end: string;
  reason: string;
}

const emptySlotForm: SlotFormState = {
  date: "",
  start: "",
  end: "",
  courtId: "",
  capacity: "",
  notes: "",
};

const emptyCourtForm: CourtFormState = {
  name: "",
  surface: "",
  notes: "",
};

const emptyBlackoutForm: BlackoutFormState = {
  playerId: "",
  start: "",
  end: "",
  reason: "",
};

export default function SchedulingManager({
  eventId,
  initialCourts,
  initialSlots,
  initialBlackouts,
  players,
  initialBlackoutLimit,
}: SchedulingManagerProps) {
  const supabase = createClient();

  const [courts, setCourts] = useState<EventCourt[]>(initialCourts);
  const [slots, setSlots] = useState<(EventSlot & { court?: EventCourt | null })[]>(initialSlots);
  const [blackouts, setBlackouts] = useState<(TeamBlackout & { player?: Player | null })[]>(initialBlackouts);
  const [blackoutLimit, setBlackoutLimit] = useState<string>(
    initialBlackoutLimit !== null && initialBlackoutLimit !== undefined
      ? String(initialBlackoutLimit)
      : ""
  );

  const [slotForm, setSlotForm] = useState<SlotFormState>(emptySlotForm);
  const [courtForm, setCourtForm] = useState<CourtFormState>(emptyCourtForm);
  const [blackoutForm, setBlackoutForm] = useState<BlackoutFormState>(emptyBlackoutForm);

  const [savingLimit, setSavingLimit] = useState(false);
  const [submittingSlot, setSubmittingSlot] = useState(false);
  const [submittingCourt, setSubmittingCourt] = useState(false);
  const [submittingBlackout, setSubmittingBlackout] = useState(false);

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach((player) => {
      map.set(player.id, player);
    });
    return map;
  }, [players]);

  const slotsGroupedByDate = useMemo(() => {
    const groups: Record<string, (EventSlot & { court?: EventCourt | null })[]> = {};
    slots
      .slice()
      .sort((a, b) => {
        if (a.slot_date === b.slot_date) {
          return a.start_time.localeCompare(b.start_time);
        }
        return a.slot_date.localeCompare(b.slot_date);
      })
      .forEach((slot) => {
        if (!groups[slot.slot_date]) {
          groups[slot.slot_date] = [];
        }
        groups[slot.slot_date].push(slot);
      });
    return groups;
  }, [slots]);

  const parseTime = (value: string) => {
    if (!value) return "";
    return value.length === 5 ? `${value}:00` : value;
  };

  const handleSaveBlackoutLimit = async () => {
    setSavingLimit(true);
    try {
      const value = blackoutLimit.trim();
      const parsed = value ? Number(value) : null;
      if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
        toast.error("黑名單上限必須是 0 或正整數");
        setSavingLimit(false);
        return;
      }

      const { error } = await supabase
        .from("events")
        .update({ blackout_limit: parsed })
        .eq("id", eventId);

      if (error) throw error;

      toast.success("已更新每隊可申報的不可出賽時段上限");
    } catch (error: any) {
      console.error("Save blackout limit error", error);
      toast.error(error?.message || "更新失敗");
    } finally {
      setSavingLimit(false);
    }
  };

  const handleAddCourt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!courtForm.name.trim()) {
      toast.error("請輸入場地名稱");
      return;
    }

    setSubmittingCourt(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        event_id: eventId,
        name: courtForm.name.trim(),
        surface: courtForm.surface.trim() || null,
        notes: courtForm.notes.trim() || null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("event_courts")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setCourts([...courts, data as EventCourt]);
      setCourtForm(emptyCourtForm);
      toast.success("新增場地成功");
    } catch (error: any) {
      console.error("Add court error", error);
      toast.error(error?.message || "新增失敗");
    } finally {
      setSubmittingCourt(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    if (!confirm("確定要刪除這個場地嗎？已排定於此場地的時段會保留但不再連結")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("event_courts")
        .delete()
        .eq("id", courtId);

      if (error) throw error;

      setCourts(courts.filter((court) => court.id !== courtId));
      setSlots(
        slots.map((slot) =>
          slot.court_id === courtId ? { ...slot, court_id: undefined, court: null } : slot
        )
      );

      toast.success("場地已刪除");
    } catch (error: any) {
      console.error("Delete court error", error);
      toast.error(error?.message || "刪除失敗");
    }
  };

  const handleAddSlot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!slotForm.date || !slotForm.start || !slotForm.end) {
      toast.error("請完整填寫日期與時間");
      return;
    }

    setSubmittingSlot(true);
    try {
      const start = parseTime(slotForm.start);
      const end = parseTime(slotForm.end);

      if (start >= end) {
        toast.error("結束時間必須晚於開始時間");
        setSubmittingSlot(false);
        return;
      }

      const now = new Date().toISOString();
      const payload = {
        event_id: eventId,
        court_id: slotForm.courtId || null,
        slot_date: slotForm.date,
        start_time: start,
        end_time: end,
        capacity: slotForm.capacity ? Number(slotForm.capacity) : null,
        notes: slotForm.notes.trim() || null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("event_slots")
        .insert(payload)
        .select("*, court:event_courts(*)")
        .single();

      if (error) throw error;

      setSlots([...slots, data as EventSlot & { court?: EventCourt | null }]);
      setSlotForm(emptySlotForm);
      toast.success("新增可用時段成功");
    } catch (error: any) {
      console.error("Add slot error", error);
      toast.error(error?.message || "新增失敗");
    } finally {
      setSubmittingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("確定要刪除此時段嗎？已指派到這個時段的比賽會保留 slot_id = null")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("event_slots")
        .delete()
        .eq("id", slotId);

      if (error) throw error;

      setSlots(slots.filter((slot) => slot.id !== slotId));
      toast.success("時段已刪除");
    } catch (error: any) {
      console.error("Delete slot error", error);
      toast.error(error?.message || "刪除失敗");
    }
  };

  const handleAddBlackout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!blackoutForm.playerId || !blackoutForm.start || !blackoutForm.end) {
      toast.error("請選擇選手並設定開始與結束時間");
      return;
    }

    if (blackoutForm.start >= blackoutForm.end) {
      toast.error("結束時間必須晚於開始時間");
      return;
    }

    setSubmittingBlackout(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        event_id: eventId,
        player_id: blackoutForm.playerId,
        start_time: new Date(blackoutForm.start).toISOString(),
        end_time: new Date(blackoutForm.end).toISOString(),
        reason: blackoutForm.reason.trim() || null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("team_blackouts")
        .insert(payload)
        .select("*, player:players(id, name, seed, department)")
        .single();

      if (error) throw error;

      setBlackouts([...blackouts, data as TeamBlackout & { player?: Player | null }]);
      setBlackoutForm(emptyBlackoutForm);
      toast.success("已新增不可出賽時段");
    } catch (error: any) {
      console.error("Add blackout error", error);
      toast.error(error?.message || "新增失敗");
    } finally {
      setSubmittingBlackout(false);
    }
  };

  const handleDeleteBlackout = async (blackoutId: string) => {
    if (!confirm("確定要刪除這筆不可出賽時段嗎？")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("team_blackouts")
        .delete()
        .eq("id", blackoutId);

      if (error) throw error;

      setBlackouts(blackouts.filter((item) => item.id !== blackoutId));
      toast.success("已刪除");
    } catch (error: any) {
      console.error("Delete blackout error", error);
      toast.error(error?.message || "刪除失敗");
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">不可出賽時段上限</h2>
        <p className="text-sm text-gray-600 mb-4">
          主辦方可以限制每個隊伍可提交的不可出賽時段數量。若留空則不限制。
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <input
            type="number"
            min={0}
            value={blackoutLimit}
            onChange={(e) => setBlackoutLimit(e.target.value)}
            className="w-full sm:w-40 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            placeholder="不限"
          />
          <button
            onClick={handleSaveBlackoutLimit}
            disabled={savingLimit}
            className="bg-ntu-green text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {savingLimit ? "儲存中..." : "儲存設定"}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-ntu-green">場地管理</h2>
            <p className="text-sm text-gray-600">如果賽事有多個場地，可以在這裡建立並標註場地資訊。</p>
          </div>
        </div>

        <form onSubmit={handleAddCourt} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">場地名稱 *</label>
            <input
              type="text"
              value={courtForm.name}
              onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：Court 1"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">場地類型</label>
            <input
              type="text"
              value={courtForm.surface}
              onChange={(e) => setCourtForm({ ...courtForm, surface: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：Hard Court"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">備註</label>
            <input
              type="text"
              value={courtForm.notes}
              onChange={(e) => setCourtForm({ ...courtForm, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：有照明設備"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={submittingCourt}
              className="w-full sm:w-auto bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submittingCourt ? "新增中..." : "新增場地"}
            </button>
          </div>
        </form>

        {courts.length === 0 ? (
          <p className="text-sm text-gray-500">尚未建立任何場地。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">名稱</th>
                  <th className="px-4 py-2 text-left">類型</th>
                  <th className="px-4 py-2 text-left">備註</th>
                  <th className="px-4 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {courts.map((court, index) => (
                  <tr key={court.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-2 font-semibold text-gray-700">{court.name}</td>
                    <td className="px-4 py-2 text-gray-600">{court.surface || "—"}</td>
                    <td className="px-4 py-2 text-gray-600">{court.notes || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDeleteCourt(court.id)}
                        className="text-red-600 hover:text-red-700 font-semibold"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-ntu-green">可用比賽時段</h2>
            <p className="text-sm text-gray-600">
              新增所有可安排比賽的時段，排程器會從這些時段中挑選。
            </p>
          </div>
        </div>

        <form onSubmit={handleAddSlot} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">日期 *</label>
            <input
              type="date"
              value={slotForm.date}
              onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">開始時間 *</label>
            <input
              type="time"
              value={slotForm.start}
              onChange={(e) => setSlotForm({ ...slotForm, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">結束時間 *</label>
            <input
              type="time"
              value={slotForm.end}
              onChange={(e) => setSlotForm({ ...slotForm, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">場地</label>
            <select
              value={slotForm.courtId}
              onChange={(e) => setSlotForm({ ...slotForm, courtId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="">未指定</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">同時可進行場數</label>
            <input
              type="number"
              min={1}
              value={slotForm.capacity}
              onChange={(e) => setSlotForm({ ...slotForm, capacity: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="默認 1"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">備註</label>
            <input
              type="text"
              value={slotForm.notes}
              onChange={(e) => setSlotForm({ ...slotForm, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：決賽預留"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={submittingSlot}
              className="w-full sm:w-auto bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submittingSlot ? "新增中..." : "新增時段"}
            </button>
          </div>
        </form>

        {slots.length === 0 ? (
          <p className="text-sm text-gray-500">尚未建立任何時段。</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(slotsGroupedByDate).map(([date, items]) => (
              <div key={date} className="border border-gray-200 rounded-lg">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
                  {new Date(date).toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" })}
                </div>
                <div className="divide-y divide-gray-200">
                  {items.map((slot) => (
                    <div key={slot.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-col text-sm">
                        <span className="font-semibold text-gray-700">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                        <span className="text-gray-600">
                          場地：{slot.court?.name || "—"}
                          {slot.capacity ? `｜可同時 ${slot.capacity} 場` : ""}
                        </span>
                        {slot.notes && <span className="text-gray-500">備註：{slot.notes}</span>}
                      </div>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-semibold"
                      >
                        刪除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-ntu-green">隊伍不可出賽時段</h2>
            <p className="text-sm text-gray-600">
              這裡可以登記隊伍提出的不可出賽時段。排程時將避開這些區間。
            </p>
          </div>
        </div>

        <form onSubmit={handleAddBlackout} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">選手 *</label>
            <select
              value={blackoutForm.playerId}
              onChange={(e) => setBlackoutForm({ ...blackoutForm, playerId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            >
              <option value="">請選擇</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                  {player.department ? `｜${player.department}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">開始時間 *</label>
            <input
              type="datetime-local"
              value={blackoutForm.start}
              onChange={(e) => setBlackoutForm({ ...blackoutForm, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">結束時間 *</label>
            <input
              type="datetime-local"
              value={blackoutForm.end}
              onChange={(e) => setBlackoutForm({ ...blackoutForm, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">原因</label>
            <input
              type="text"
              value={blackoutForm.reason}
              onChange={(e) => setBlackoutForm({ ...blackoutForm, reason: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：系課衝突"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={submittingBlackout}
              className="w-full sm:w-auto bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submittingBlackout ? "新增中..." : "新增黑名單"}
            </button>
          </div>
        </form>

        {blackouts.length === 0 ? (
          <p className="text-sm text-gray-500">目前沒有任何不可出賽時段。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">選手</th>
                  <th className="px-4 py-2 text-left">開始</th>
                  <th className="px-4 py-2 text-left">結束</th>
                  <th className="px-4 py-2 text-left">原因</th>
                  <th className="px-4 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {blackouts
                  .slice()
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2 font-semibold text-gray-700">{item.player?.name || playersById.get(item.player_id || "")?.name || "未找到"}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(item.start_time).toLocaleString("zh-TW", {
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(item.end_time).toLocaleString("zh-TW", {
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{item.reason || "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleDeleteBlackout(item.id)}
                          className="text-red-600 hover:text-red-700 font-semibold"
                        >
                          刪除
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
