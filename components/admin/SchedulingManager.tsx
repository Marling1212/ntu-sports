"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  EventCourt,
  EventSlot,
  EventSlotTemplate,
  Player,
  TeamBlackout,
  TeamBlackoutTemplate,
} from "@/types/database";

type SlotRecord = EventSlot & { court?: EventCourt | null };
type BlackoutRecord = TeamBlackout & { player?: Player | null };
type SlotTemplateRecord = EventSlotTemplate & { court?: EventCourt | null };
type BlackoutTemplateRecord = TeamBlackoutTemplate & { player?: Player | null };

interface SchedulingManagerProps {
  eventId: string;
  initialCourts: EventCourt[];
  initialSlots: SlotRecord[];
  initialBlackouts: BlackoutRecord[];
  initialSlotTemplates: SlotTemplateRecord[];
  initialBlackoutTemplates: BlackoutTemplateRecord[];
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

interface SlotTemplateFormState {
  dayOfWeek: string;
  start: string;
  end: string;
  courtId: string;
  capacity: string;
  notes: string;
}

interface SlotTemplateGenerateFormState {
  startDate: string;
  endDate: string;
  includeExisting: boolean;
}

interface BlackoutFormState {
  playerId: string;
  start: string;
  end: string;
  reason: string;
}

interface BlackoutTemplateFormState {
  playerId: string;
  dayOfWeek: string;
  start: string;
  end: string;
  reason: string;
}

interface BlackoutTemplateGenerateFormState {
  startDate: string;
  endDate: string;
  overwrite: boolean;
}

const WEEKDAY_LABELS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
const TAIPEI_TZ = "Asia/Taipei";

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

const emptySlotTemplateForm: SlotTemplateFormState = {
  dayOfWeek: "1",
  start: "",
  end: "",
  courtId: "",
  capacity: "",
  notes: "",
};

const emptySlotTemplateGenerateForm: SlotTemplateGenerateFormState = {
  startDate: "",
  endDate: "",
  includeExisting: false,
};

const emptyBlackoutForm: BlackoutFormState = {
  playerId: "",
  start: "",
  end: "",
  reason: "",
};

const emptyBlackoutTemplateForm: BlackoutTemplateFormState = {
  playerId: "",
  dayOfWeek: "1",
  start: "",
  end: "",
  reason: "",
};

const emptyBlackoutTemplateGenerateForm: BlackoutTemplateGenerateFormState = {
  startDate: "",
  endDate: "",
  overwrite: false,
};

const parseTime = (value: string) => {
  if (!value) return "";
  return value.length === 5 ? `${value}:00` : value;
};

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toISODateTime = (date: Date, time: string) => {
  const [hh, mm, ss = "00"] = time.split(":");
  const isoDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(hh),
    Number(mm),
    Number(ss),
  );
  return isoDate.toISOString();
};

const getWeekKey = (date: Date) => {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const week =
    1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
};

const buildExistingWeekCounts = (items: BlackoutRecord[]) => {
  const counts = new Map<string, Map<string, number>>();
  items.forEach((item) => {
    const playerId = item.player_id || "";
    if (!playerId) return;
    const week = getWeekKey(new Date(item.start_time));
    if (!counts.has(playerId)) counts.set(playerId, new Map());
    const playerMap = counts.get(playerId)!;
    playerMap.set(week, (playerMap.get(week) || 0) + 1);
  });
  return counts;
};

export default function SchedulingManager({
  eventId,
  initialCourts,
  initialSlots,
  initialBlackouts,
  initialSlotTemplates,
  initialBlackoutTemplates,
  players,
  initialBlackoutLimit,
}: SchedulingManagerProps) {
  const supabase = createClient();

  const [courts, setCourts] = useState<EventCourt[]>(initialCourts);
  const [slots, setSlots] = useState<SlotRecord[]>(initialSlots);
  const [blackouts, setBlackouts] = useState<BlackoutRecord[]>(initialBlackouts);
  const [slotTemplates, setSlotTemplates] = useState<SlotTemplateRecord[]>(initialSlotTemplates);
  const [blackoutTemplates, setBlackoutTemplates] = useState<BlackoutTemplateRecord[]>(initialBlackoutTemplates);
  const [blackoutLimit, setBlackoutLimit] = useState<string>(
    initialBlackoutLimit !== null && initialBlackoutLimit !== undefined
      ? String(initialBlackoutLimit)
      : ""
  );

  const [slotForm, setSlotForm] = useState<SlotFormState>(emptySlotForm);
  const [courtForm, setCourtForm] = useState<CourtFormState>(emptyCourtForm);
  const [slotTemplateForm, setSlotTemplateForm] = useState<SlotTemplateFormState>(emptySlotTemplateForm);
  const [slotTemplateGenerateForm, setSlotTemplateGenerateForm] = useState<SlotTemplateGenerateFormState>(emptySlotTemplateGenerateForm);
  const [blackoutForm, setBlackoutForm] = useState<BlackoutFormState>(emptyBlackoutForm);
  const [blackoutTemplateForm, setBlackoutTemplateForm] = useState<BlackoutTemplateFormState>(emptyBlackoutTemplateForm);
  const [blackoutTemplateGenerateForm, setBlackoutTemplateGenerateForm] = useState<BlackoutTemplateGenerateFormState>(emptyBlackoutTemplateGenerateForm);

  const [savingLimit, setSavingLimit] = useState(false);
  const [submittingSlot, setSubmittingSlot] = useState(false);
  const [submittingCourt, setSubmittingCourt] = useState(false);
  const [submittingBlackout, setSubmittingBlackout] = useState(false);
  const [submittingSlotTemplate, setSubmittingSlotTemplate] = useState(false);
  const [generatingSlots, setGeneratingSlots] = useState(false);
  const [submittingBlackoutTemplate, setSubmittingBlackoutTemplate] = useState(false);
  const [generatingBlackouts, setGeneratingBlackouts] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportSummary, setBulkImportSummary] = useState<string | null>(null);

  const bulkFileRef = useRef<HTMLInputElement | null>(null);

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach((player) => map.set(player.id, player));
    return map;
  }, [players]);

  const playersByName = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach((player) => map.set(player.name.trim().toLowerCase(), player));
    return map;
  }, [players]);

  const slotsGroupedByDate = useMemo(() => {
    const groups: Record<string, SlotRecord[]> = {};
    slots
      .slice()
      .sort((a, b) =>
        a.slot_date === b.slot_date
          ? a.start_time.localeCompare(b.start_time)
          : a.slot_date.localeCompare(b.slot_date),
      )
      .forEach((slot) => {
        if (!groups[slot.slot_date]) groups[slot.slot_date] = [];
        groups[slot.slot_date].push(slot);
      });
    return groups;
  }, [slots]);

  const slotTemplateGroups = useMemo(() => {
    const map: Record<number, SlotTemplateRecord[]> = {};
    slotTemplates
      .slice()
      .sort((a, b) =>
        a.day_of_week === b.day_of_week
          ? a.start_time.localeCompare(b.start_time)
          : a.day_of_week - b.day_of_week,
      )
      .forEach((template) => {
        if (!map[template.day_of_week]) map[template.day_of_week] = [];
        map[template.day_of_week].push(template);
      });
    return map;
  }, [slotTemplates]);

  const blackoutTemplatesGrouped = useMemo(() => {
    const map = new Map<string, BlackoutTemplateRecord[]>();
    blackoutTemplates
      .slice()
      .sort((a, b) =>
        a.player_id === b.player_id
          ? a.day_of_week === b.day_of_week
            ? a.start_time.localeCompare(b.start_time)
            : a.day_of_week - b.day_of_week
          : a.player_id.localeCompare(b.player_id),
      )
      .forEach((template) => {
        if (!map.has(template.player_id)) map.set(template.player_id, []);
        map.get(template.player_id)!.push(template);
      });
    return map;
  }, [blackoutTemplates]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-TW", {
        month: "long",
        day: "numeric",
        weekday: "short",
        timeZone: TAIPEI_TZ,
      }),
    [],
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-TW", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: TAIPEI_TZ,
      }),
    [],
  );

  const formatDateHeader = (date: string) => dateFormatter.format(parseDateOnly(date));
  const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value));

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
          slot.court_id === courtId ? { ...slot, court_id: undefined, court: null } : slot,
        ),
      );
      setSlotTemplates(
        slotTemplates.map((template) =>
          template.court_id === courtId
            ? ({ ...template, court_id: undefined, court: null } as SlotTemplateRecord)
            : template,
        ),
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

    const start = parseTime(slotForm.start);
    const end = parseTime(slotForm.end);
    if (start >= end) {
      toast.error("結束時間必須晚於開始時間");
      return;
    }

    setSubmittingSlot(true);
    try {
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

      setSlots([...slots, data as SlotRecord]);
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

  const handleAddSlotTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slotTemplateForm.start || !slotTemplateForm.end) {
      toast.error("請填寫開始與結束時間");
      return;
    }

    const start = parseTime(slotTemplateForm.start);
    const end = parseTime(slotTemplateForm.end);
    if (start >= end) {
      toast.error("結束時間必須晚於開始時間");
      return;
    }

    setSubmittingSlotTemplate(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        event_id: eventId,
        day_of_week: Number(slotTemplateForm.dayOfWeek),
        start_time: start,
        end_time: end,
        court_id: slotTemplateForm.courtId || null,
        capacity: slotTemplateForm.capacity ? Number(slotTemplateForm.capacity) : null,
        notes: slotTemplateForm.notes.trim() || null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("event_slot_templates")
        .insert(payload)
        .select("*, court:event_courts(*)")
        .single();

      if (error) throw error;

      setSlotTemplates([...slotTemplates, data as SlotTemplateRecord]);
      setSlotTemplateForm(emptySlotTemplateForm);
      toast.success("已新增每週時段模板");
    } catch (error: any) {
      console.error("Add slot template error", error);
      toast.error(error?.message || "新增失敗");
    } finally {
      setSubmittingSlotTemplate(false);
    }
  };

  const handleDeleteSlotTemplate = async (templateId: string) => {
    if (!confirm("確定要刪除此模板嗎？")) return;
    try {
      const { error } = await supabase
        .from("event_slot_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setSlotTemplates(slotTemplates.filter((template) => template.id !== templateId));
      toast.success("模板已刪除");
    } catch (error: any) {
      console.error("Delete slot template error", error);
      toast.error(error?.message || "刪除失敗");
    }
  };

  const handleGenerateSlotsFromTemplates = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slotTemplateGenerateForm.startDate || !slotTemplateGenerateForm.endDate) {
      toast.error("請選擇套用的起訖日期");
      return;
    }

    if (slotTemplates.length === 0) {
      toast.error("請先建立至少一個每週時段模板");
      return;
    }

    const startDate = parseDateOnly(slotTemplateGenerateForm.startDate);
    const endDate = parseDateOnly(slotTemplateGenerateForm.endDate);
    if (startDate > endDate) {
      toast.error("結束日期必須晚於開始日期");
      return;
    }

    const existingKeys = new Set(
      slots.map((slot) =>
        `${slot.slot_date}#${slot.start_time}#${slot.end_time}#${slot.court_id ?? "none"}`,
      ),
    );

    const records: any[] = [];
    const preview: string[] = [];
    const includeExisting = slotTemplateGenerateForm.includeExisting;

    for (
      let cursor = new Date(startDate.getTime());
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const day = cursor.getDay();
      const templates = slotTemplates.filter((template) => template.day_of_week === day);
      if (templates.length === 0) continue;

      const dateKey = formatDateKey(cursor);
      templates.forEach((template) => {
        const key = `${dateKey}#${template.start_time}#${template.end_time}#${template.court_id ?? "none"}`;
        if (!includeExisting && existingKeys.has(key)) {
          return;
        }
        existingKeys.add(key);
        records.push({
          event_id: eventId,
          court_id: template.court_id || null,
          slot_date: dateKey,
          start_time: template.start_time,
          end_time: template.end_time,
          capacity: template.capacity ?? null,
          notes: template.notes ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        preview.push(`${dateKey} ${template.start_time.slice(0, 5)}-${template.end_time.slice(0, 5)}`);
      });
    }

    if (records.length === 0) {
      toast("沒有新增任何時段，可能是已存在或日期未對應模板。", { icon: "ℹ️" });
      return;
    }

    setGeneratingSlots(true);
    try {
      const chunkSize = 50;
      const inserted: SlotRecord[] = [];
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("event_slots")
          .insert(chunk)
          .select("*, court:event_courts(*)");
        if (error) throw error;
        inserted.push(...((data as SlotRecord[]) || []));
      }

      setSlots([...slots, ...inserted]);
      setSlotTemplateGenerateForm(emptySlotTemplateGenerateForm);
      toast.success(`已新增 ${inserted.length} 筆時段`);
    } catch (error: any) {
      console.error("Generate slots error", error);
      toast.error(error?.message || "生成失敗");
    } finally {
      setGeneratingSlots(false);
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

      setBlackouts([...blackouts, data as BlackoutRecord]);
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
    if (!confirm("確定要刪除這筆不可出賽時段嗎？")) return;
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

  const handleAddBlackoutTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!blackoutTemplateForm.playerId || !blackoutTemplateForm.start || !blackoutTemplateForm.end) {
      toast.error("請填寫完整資訊");
      return;
    }

    const start = parseTime(blackoutTemplateForm.start);
    const end = parseTime(blackoutTemplateForm.end);
    if (start >= end) {
      toast.error("結束時間必須晚於開始時間");
      return;
    }

    setSubmittingBlackoutTemplate(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        event_id: eventId,
        player_id: blackoutTemplateForm.playerId,
        day_of_week: Number(blackoutTemplateForm.dayOfWeek),
        start_time: start,
        end_time: end,
        reason: blackoutTemplateForm.reason.trim() || null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("team_blackout_templates")
        .insert(payload)
        .select("*, player:players(id, name, department, seed)")
        .single();

      if (error) throw error;

      setBlackoutTemplates([...blackoutTemplates, data as BlackoutTemplateRecord]);
      setBlackoutTemplateForm(emptyBlackoutTemplateForm);
      toast.success("已新增每週黑名單模板");
    } catch (error: any) {
      console.error("Add blackout template error", error);
      toast.error(error?.message || "新增失敗");
    } finally {
      setSubmittingBlackoutTemplate(false);
    }
  };

  const handleDeleteBlackoutTemplate = async (templateId: string) => {
    if (!confirm("確定要刪除此模板嗎？")) return;
    try {
      const { error } = await supabase
        .from("team_blackout_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setBlackoutTemplates(blackoutTemplates.filter((template) => template.id !== templateId));
      toast.success("模板已刪除");
    } catch (error: any) {
      console.error("Delete blackout template error", error);
      toast.error(error?.message || "刪除失敗");
    }
  };

  const handleGenerateBlackoutsFromTemplates = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!blackoutTemplateGenerateForm.startDate || !blackoutTemplateGenerateForm.endDate) {
      toast.error("請選擇起訖日期");
      return;
    }

    if (blackoutTemplates.length === 0) {
      toast.error("請先建立每週黑名單模板");
      return;
    }

    const startDate = parseDateOnly(blackoutTemplateGenerateForm.startDate);
    const endDate = parseDateOnly(blackoutTemplateGenerateForm.endDate);
    if (startDate > endDate) {
      toast.error("結束日期必須晚於開始日期");
      return;
    }

    const existingWeekCounts = buildExistingWeekCounts(blackouts);
    const limit = blackoutLimit.trim() ? Number(blackoutLimit.trim()) : null;
    const records: any[] = [];
    const skipped: string[] = [];
    const seenKeys = new Set(
      blackouts.map((item) => `${item.player_id || ""}#${item.start_time}#${item.end_time}`),
    );

    for (
      let cursor = new Date(startDate.getTime());
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const day = cursor.getDay();
      blackoutTemplates
        .filter((template) => template.day_of_week === day)
        .forEach((template) => {
          const playerId = template.player_id;
          const weekKey = getWeekKey(cursor);
          if (limit !== null) {
            if (!existingWeekCounts.has(playerId)) {
              existingWeekCounts.set(playerId, new Map([[weekKey, 0]]));
            }
            const playerMap = existingWeekCounts.get(playerId)!;
            const currentCount = playerMap.get(weekKey) || 0;
            if (currentCount >= limit) {
              skipped.push(`${playersById.get(playerId)?.name || "玩家"} 在 ${weekKey}`);
              return;
            }
            playerMap.set(weekKey, currentCount + 1);
          }

          const dateKey = formatDateKey(cursor);
          const startIso = toISODateTime(cursor, template.start_time);
          const endIso = toISODateTime(cursor, template.end_time);
          const uniqueness = `${playerId}#${startIso}#${endIso}`;
          if (!blackoutTemplateGenerateForm.overwrite && seenKeys.has(uniqueness)) {
            return;
          }
          seenKeys.add(uniqueness);

          records.push({
            event_id: eventId,
            player_id: playerId,
            start_time: startIso,
            end_time: endIso,
            reason: template.reason ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });
    }

    if (records.length === 0) {
      toast("沒有新增任何黑名單，可能是已存在或超過上限", { icon: "ℹ️" });
      if (skipped.length > 0) {
        console.info("Skipped due to limits:", skipped.join(", "));
      }
      return;
    }

    setGeneratingBlackouts(true);
    try {
      const chunkSize = 50;
      const inserted: BlackoutRecord[] = [];
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("team_blackouts")
          .insert(chunk)
          .select("*, player:players(id, name, department, seed)");
        if (error) throw error;
        inserted.push(...((data as BlackoutRecord[]) || []));
      }

      setBlackouts([...blackouts, ...inserted]);
      setBlackoutTemplateGenerateForm(emptyBlackoutTemplateGenerateForm);
      toast.success(`已新增 ${inserted.length} 筆不可出賽時段`);
      if (skipped.length > 0) {
        toast(() => (
          <div className="text-sm">
            <div className="font-semibold">部分隊伍已達每週上限，以下時段未新增：</div>
            <ul className="list-disc list-inside text-xs text-gray-600">
              {skipped.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
              {skipped.length > 5 && <li>…等 {skipped.length - 5} 項</li>}
            </ul>
          </div>
        ));
      }
    } catch (error: any) {
      console.error("Generate blackouts error", error);
      toast.error(error?.message || "生成失敗");
    } finally {
      setGeneratingBlackouts(false);
    }
  };

  const handleBulkImportBlackouts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkImporting(true);
    setBulkImportSummary(null);
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        toast.error("檔案內容為空");
        return;
      }

      const rows = lines[0].toLowerCase().includes("player") ? lines.slice(1) : lines;
      const records: any[] = [];
      const errors: string[] = [];

      const limit = blackoutLimit.trim() ? Number(blackoutLimit.trim()) : null;
      const weekCounts = new Map(buildExistingWeekCounts(blackouts));
      const duplicateCheck = new Set(
        blackouts.map((item) => `${item.player_id || ""}#${item.start_time}#${item.end_time}`),
      );

      rows.forEach((line, index) => {
        const parts = line.split(",").map((part) => part.trim());
        if (parts.length < 3) {
          errors.push(`第 ${index + 1} 行欄位不足`);
          return;
        }

        const [playerName, startRaw, endRaw, reasonRaw] = parts;
        const player = playersByName.get(playerName.toLowerCase());
        if (!player) {
          errors.push(`第 ${index + 1} 行：找不到選手 ${playerName}`);
          return;
        }

        const startDate = new Date(startRaw);
        const endDate = new Date(endRaw);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          errors.push(`第 ${index + 1} 行：時間格式錯誤`);
          return;
        }
        if (startDate >= endDate) {
          errors.push(`第 ${index + 1} 行：結束時間需晚於開始時間`);
          return;
        }

        const weekKey = getWeekKey(startDate);
        if (!weekCounts.has(player.id)) weekCounts.set(player.id, new Map());
        const playerMap = weekCounts.get(player.id)!;
        const currentCount = playerMap.get(weekKey) || 0;
        if (limit !== null && currentCount >= limit) {
          errors.push(`第 ${index + 1} 行：${player.name} 在 ${weekKey} 已達上限`);
          return;
        }
        playerMap.set(weekKey, currentCount + 1);

        const isoStart = startDate.toISOString();
        const isoEnd = endDate.toISOString();
        const uniqKey = `${player.id}#${isoStart}#${isoEnd}`;
        if (duplicateCheck.has(uniqKey)) {
          errors.push(`第 ${index + 1} 行：與現有資料重複`);
          return;
        }
        duplicateCheck.add(uniqKey);

        records.push({
          event_id: eventId,
          player_id: player.id,
          start_time: isoStart,
          end_time: isoEnd,
          reason: reasonRaw || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });

      if (records.length === 0) {
        toast.error("匯入失敗，沒有可新增的資料");
        if (errors.length) {
          setBulkImportSummary(errors.slice(0, 10).join("\n"));
        }
        return;
      }

      const { data, error } = await supabase
        .from("team_blackouts")
        .insert(records)
        .select("*, player:players(id, name, department, seed)");

      if (error) throw error;

      setBlackouts([...blackouts, ...((data as BlackoutRecord[]) || [])]);
      setBulkImportSummary(`成功新增 ${records.length} 筆。${errors.length ? `另有 ${errors.length} 筆失敗。` : ""}`);
      if (errors.length) {
        console.warn("Bulk import skipped", errors);
      }
      toast.success(`已匯入 ${records.length} 筆不可出賽時段`);
    } catch (error: any) {
      console.error("Bulk import error", error);
      toast.error(error?.message || "匯入失敗");
    } finally {
      setBulkImporting(false);
      if (bulkFileRef.current) bulkFileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">不可出賽時段上限</h2>
        <p className="text-sm text-gray-600 mb-4">
          主辦方可以限制每個隊伍可提交的不可出賽時段數量（每週）。若留空則不限制。
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
            <p className="text-sm text-gray-600">
              若賽事有多個場地，可在這裡建立並標註資訊。下方所有設定都可引用這些場地。
            </p>
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

      <section className="bg-white rounded-xl shadow-md p-6 border border-gray-100 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ntu-green">每週比賽時段模板</h2>
            <p className="text-sm text-gray-600">
              設定每週固定的可用時段後，就能一次生成整個賽季的時段，僅需針對少數例外手動調整。
            </p>
          </div>
        </div>

        <form onSubmit={handleAddSlotTemplate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">星期 *</label>
            <select
              value={slotTemplateForm.dayOfWeek}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, dayOfWeek: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">開始 *</label>
            <input
              type="time"
              value={slotTemplateForm.start}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">結束 *</label>
            <input
              type="time"
              value={slotTemplateForm.end}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">場地</label>
            <select
              value={slotTemplateForm.courtId}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, courtId: e.target.value })}
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
              value={slotTemplateForm.capacity}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, capacity: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="默認 1"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">備註</label>
            <input
              type="text"
              value={slotTemplateForm.notes}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：決賽預留"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={submittingSlotTemplate}
              className="w-full bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submittingSlotTemplate ? "新增中..." : "新增模板"}
            </button>
          </div>
        </form>

        {slotTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">尚未建立任何模板。</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(slotTemplateGroups).map(([day, templates]) => (
              <div key={day} className="border border-gray-200 rounded-lg">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
                  {WEEKDAY_LABELS[Number(day)]}
                </div>
                <div className="divide-y divide-gray-200">
                  {templates.map((template) => (
                    <div key={template.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">
                          {template.start_time.slice(0, 5)} - {template.end_time.slice(0, 5)}
                        </span>
                        <span className="text-gray-600">
                          場地：{template.court?.name || "—"}
                          {template.capacity ? `｜可同時 ${template.capacity} 場` : ""}
                        </span>
                        {template.notes && <span className="text-gray-500">備註：{template.notes}</span>}
                      </div>
                      <button
                        onClick={() => handleDeleteSlotTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 font-semibold"
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

        <form onSubmit={handleGenerateSlotsFromTemplates} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">套用日期（開始）*</label>
            <input
              type="date"
              value={slotTemplateGenerateForm.startDate}
              onChange={(e) => setSlotTemplateGenerateForm({ ...slotTemplateGenerateForm, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">套用日期（結束）*</label>
            <input
              type="date"
              value={slotTemplateGenerateForm.endDate}
              onChange={(e) => setSlotTemplateGenerateForm({ ...slotTemplateGenerateForm, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={slotTemplateGenerateForm.includeExisting}
              onChange={(e) => setSlotTemplateGenerateForm({ ...slotTemplateGenerateForm, includeExisting: e.target.checked })}
              className="h-4 w-4"
            />
            覆蓋已存在的同時段
          </label>
          <button
            type="submit"
            disabled={generatingSlots}
            className="bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generatingSlots ? "產生中..." : "依模板生成時段"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-ntu-green">所有可用時段</h2>
            <p className="text-sm text-gray-600">
              自動生成後仍可針對個別時段調整或刪除，確保最終排程精準。
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
                  {formatDateHeader(date)}
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

      <section className="bg-white rounded-xl shadow-md p-6 border border-gray-100 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ntu-green">隊伍不可出賽時段</h2>
            <p className="text-sm text-gray-600">
              每週模板 + 大量匯入，快速蒐集各隊的不能出賽時間，排程器會自動避開。
            </p>
          </div>
        </div>

        <form onSubmit={handleAddBlackoutTemplate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">選手/隊伍 *</label>
            <select
              value={blackoutTemplateForm.playerId}
              onChange={(e) => setBlackoutTemplateForm({ ...blackoutTemplateForm, playerId: e.target.value })}
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
            <label className="text-sm font-medium text-gray-700 mb-1">星期 *</label>
            <select
              value={blackoutTemplateForm.dayOfWeek}
              onChange={(e) => setBlackoutTemplateForm({ ...blackoutTemplateForm, dayOfWeek: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={index} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">開始 *</label>
            <input
              type="time"
              value={blackoutTemplateForm.start}
              onChange={(e) => setBlackoutTemplateForm({ ...blackoutTemplateForm, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">結束 *</label>
            <input
              type="time"
              value={blackoutTemplateForm.end}
              onChange={(e) => setBlackoutTemplateForm({ ...blackoutTemplateForm, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">原因</label>
            <input
              type="text"
              value={blackoutTemplateForm.reason}
              onChange={(e) => setBlackoutTemplateForm({ ...blackoutTemplateForm, reason: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：社團固定練習"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={submittingBlackoutTemplate}
              className="w-full bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submittingBlackoutTemplate ? "新增中..." : "新增模板"}
            </button>
          </div>
        </form>

        {blackoutTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">尚未建立任何模板。</p>
        ) : (
          <div className="space-y-4">
            {Array.from(blackoutTemplatesGrouped.entries()).map(([playerId, templates]) => (
              <div key={playerId} className="border border-gray-200 rounded-lg">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
                  {playersById.get(playerId)?.name || "未知選手"}
                </div>
                <div className="divide-y divide-gray-200">
                  {templates.map((template) => (
                    <div key={template.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">
                          {WEEKDAY_LABELS[template.day_of_week]}｜
                          {template.start_time.slice(0, 5)} - {template.end_time.slice(0, 5)}
                        </span>
                        {template.reason && <span className="text-gray-500">{template.reason}</span>}
                      </div>
                      <button
                        onClick={() => handleDeleteBlackoutTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 font-semibold"
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

        <form onSubmit={handleGenerateBlackoutsFromTemplates} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">套用日期（開始）*</label>
            <input
              type="date"
              value={blackoutTemplateGenerateForm.startDate}
              onChange={(e) => setBlackoutTemplateGenerateForm({ ...blackoutTemplateGenerateForm, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">套用日期（結束）*</label>
            <input
              type="date"
              value={blackoutTemplateGenerateForm.endDate}
              onChange={(e) => setBlackoutTemplateGenerateForm({ ...blackoutTemplateGenerateForm, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={blackoutTemplateGenerateForm.overwrite}
              onChange={(e) => setBlackoutTemplateGenerateForm({ ...blackoutTemplateGenerateForm, overwrite: e.target.checked })}
              className="h-4 w-4"
            />
            若遇相同時段，仍覆蓋新增
          </label>
          <button
            type="submit"
            disabled={generatingBlackouts}
            className="bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generatingBlackouts ? "產生中..." : "依模板生成黑名單"}
          </button>
        </form>

        <div className="rounded-lg border border-dashed border-gray-300 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">大量匯入不可出賽時段</h3>
              <p className="text-sm text-gray-600">
                CSV 欄位順序：<span className="font-mono">player_name,start_datetime,end_datetime,reason</span>。時間請使用 ISO 格式，例如 <span className="font-mono">2025-01-15T18:00</span>。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={bulkFileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleBulkImportBlackouts}
                disabled={bulkImporting}
                className="text-sm"
              />
            </div>
          </div>
          {bulkImportSummary && (
            <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">
              {bulkImportSummary}
            </div>
          )}
        </div>

        <form onSubmit={handleAddBlackout} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
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
          <div className="overflow-x-auto mt-6">
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
                      <td className="px-4 py-2 font-semibold text-gray-700">
                        {item.player?.name || playersById.get(item.player_id || "")?.name || "未找到"}
                      </td>
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
