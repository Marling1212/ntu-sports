"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  code: string;
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
  code: string;
}

interface SlotTemplateGenerateFormState {
  startDate: string;
  endDate: string;
  includeExisting: boolean;
}

interface BlackoutTemplateFormState {
  playerId: string;
  slotTemplateId: string;
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
  code: "",
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
  code: "",
};

const emptySlotTemplateGenerateForm: SlotTemplateGenerateFormState = {
  startDate: "",
  endDate: "",
  includeExisting: false,
};

const emptyBlackoutTemplateForm: BlackoutTemplateFormState = {
  playerId: "",
  slotTemplateId: "",
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

const normalizeTimeInput = (value: string): string | null => {
  const trimmed = value.trim();
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return null;
  }
  const [hRaw, mRaw, sRaw = "00"] = trimmed.split(":");
  const hh = Number(hRaw);
  const mm = Number(mRaw);
  const ss = Number(sRaw);
  if ([hh, mm, ss].some(Number.isNaN) || hh > 23 || mm > 59 || ss > 59) {
    return null;
  }
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const WEEKDAY_ALIAS: Record<string, number> = {
  "0": 0,
  "7": 0,
  "sun": 0,
  "sunday": 0,
  "日": 0,
  "週日": 0,
  "星期日": 0,
  "天": 0,
  "1": 1,
  "mon": 1,
  "monday": 1,
  "一": 1,
  "週一": 1,
  "星期一": 1,
  "2": 2,
  "tue": 2,
  "tuesday": 2,
  "二": 2,
  "週二": 2,
  "星期二": 2,
  "3": 3,
  "wed": 3,
  "wednesday": 3,
  "三": 3,
  "週三": 3,
  "星期三": 3,
  "4": 4,
  "thu": 4,
  "thur": 4,
  "thursday": 4,
  "四": 4,
  "週四": 4,
  "星期四": 4,
  "5": 5,
  "fri": 5,
  "friday": 5,
  "五": 5,
  "週五": 5,
  "星期五": 5,
  "6": 6,
  "sat": 6,
  "saturday": 6,
  "六": 6,
  "週六": 6,
  "星期六": 6,
};

const parseWeekdayValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const lower = trimmed.toLowerCase();
  if (WEEKDAY_ALIAS[lower] !== undefined) return WEEKDAY_ALIAS[lower];
  const lastChar = trimmed[trimmed.length - 1];
  if (WEEKDAY_ALIAS[lastChar] !== undefined) return WEEKDAY_ALIAS[lastChar];
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 6) return numeric;
  return null;
};

const splitCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((value) => value.trim());
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
  const [blackoutTemplateForm, setBlackoutTemplateForm] = useState<BlackoutTemplateFormState>(emptyBlackoutTemplateForm);
  const [blackoutTemplateGenerateForm, setBlackoutTemplateGenerateForm] = useState<BlackoutTemplateGenerateFormState>(emptyBlackoutTemplateGenerateForm);

  const [savingLimit, setSavingLimit] = useState(false);
  const [submittingSlot, setSubmittingSlot] = useState(false);
  const [submittingCourt, setSubmittingCourt] = useState(false);
  const [submittingSlotTemplate, setSubmittingSlotTemplate] = useState(false);
  const [submittingBlackoutTemplate, setSubmittingBlackoutTemplate] = useState(false);
  const [generatingSlots, setGeneratingSlots] = useState(false);
  const [generatingBlackouts, setGeneratingBlackouts] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportSummary, setBulkImportSummary] = useState<string | null>(null);
  const [slotCodePrefix, setSlotCodePrefix] = useState("S");
  const [slotCodeDigits, setSlotCodeDigits] = useState("3");
  const [slotCodeStart, setSlotCodeStart] = useState("1");
  const [assigningSlotCodes, setAssigningSlotCodes] = useState(false);
  const [slotTemplateImporting, setSlotTemplateImporting] = useState(false);
  const [slotTemplateImportSummary, setSlotTemplateImportSummary] = useState<string | null>(null);
  const [slotTemplateImportReplace, setSlotTemplateImportReplace] = useState(false);
  const [bulkImportReplaceTemplates, setBulkImportReplaceTemplates] = useState(false);
  const [bulkImportGenerateAfter, setBulkImportGenerateAfter] = useState(true);

  const bulkFileRef = useRef<HTMLInputElement | null>(null);
  const slotTemplateFileRef = useRef<HTMLInputElement | null>(null);

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

  const courtsByName = useMemo(() => {
    const map = new Map<string, EventCourt>();
    courts.forEach((court) => {
      if (court.name) {
        map.set(court.name.trim().toLowerCase(), court);
      }
    });
    return map;
  }, [courts]);

  const slotTemplatesById = useMemo(() => {
    const map = new Map<string, SlotTemplateRecord>();
    slotTemplates.forEach((template) => map.set(template.id, template));
    return map;
  }, [slotTemplates]);

  const slotTemplatesByKey = useMemo(() => {
    const map = new Map<string, SlotTemplateRecord>();
    slotTemplates.forEach((template) => {
      const key = `${template.day_of_week}-${template.start_time.slice(0, 5)}-${template.end_time.slice(0, 5)}`;
      map.set(key, template);
    });
    return map;
  }, [slotTemplates]);

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

  const formatDateHeader = (date: string) => dateFormatter.format(parseDateOnly(date));

  const getSlotCodeFromDate = useCallback(
    (date: Date, start: string, end: string) => {
      const key = `${date.getDay()}-${start}-${end}`;
      const template = slotTemplatesByKey.get(key);
      return template?.code || `${start}-${end}`;
    },
    [slotTemplatesByKey],
  );

  const getSlotCodeFromTemplate = useCallback(
    (template: BlackoutTemplateRecord) => {
      const key = `${template.day_of_week}-${template.start_time.slice(0, 5)}-${template.end_time.slice(0, 5)}`;
      const match = slotTemplatesByKey.get(key);
      return match?.code || WEEKDAY_LABELS[template.day_of_week];
    },
    [slotTemplatesByKey],
  );

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
        code: slotForm.code.trim() || null,
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
        code: slotTemplateForm.code.trim() || null,
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
          code: null,
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

  const handleAddBlackoutTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!blackoutTemplateForm.playerId || !blackoutTemplateForm.slotTemplateId) {
      toast.error("請選擇選手和時段代號");
      return;
    }

    const template = slotTemplatesById.get(blackoutTemplateForm.slotTemplateId);
    if (!template) {
      toast.error("找不到對應的時段代號");
      return;
    }

    setSubmittingBlackoutTemplate(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        event_id: eventId,
        player_id: blackoutTemplateForm.playerId,
        day_of_week: template.day_of_week,
        start_time: template.start_time,
        end_time: template.end_time,
        reason: null,
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
            reason: null,
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

  const handleBulkImportBlackouts = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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

      const dataLines = lines[0].toLowerCase().includes("player") ? lines.slice(1) : lines;
      if (dataLines.length === 0) {
        toast.error("沒有資料列");
        return;
      }

      if (bulkImportReplaceTemplates) {
        const { error: deleteError } = await supabase
          .from("team_blackout_templates")
          .delete()
          .eq("event_id", eventId);
        if (deleteError) throw deleteError;
        setBlackoutTemplates([]);
      }

      const rowsByPlayer = new Map<string, Set<string>>();
      const errors: string[] = [];

      dataLines.forEach((line, index) => {
        const parts = splitCsvLine(line);
        const rowIndex = lines[0].toLowerCase().includes("player") ? index + 2 : index + 1;

        if (parts.length < 2) {
          errors.push(`第 ${rowIndex} 行欄位不足（需要選手姓名與代號）`);
          return;
        }

        const [playerRaw, codeRaw] = parts;
        const playerName = playerRaw.trim();
        const slotCode = codeRaw.trim();

        if (!playerName) {
          errors.push(`第 ${rowIndex} 行缺少選手姓名`);
          return;
        }
        if (!slotCode) {
          errors.push(`第 ${rowIndex} 行缺少時段代號`);
          return;
        }

        const player = playersByName.get(playerName.toLowerCase());
        if (!player) {
          errors.push(`第 ${rowIndex} 行找不到選手：${playerName}`);
          return;
        }

        const template = slotTemplates.find((item) => item.code?.toLowerCase() === slotCode.toLowerCase());
        if (!template) {
          errors.push(`第 ${rowIndex} 行找不到時段代號：${slotCode}`);
          return;
        }

        if (!rowsByPlayer.has(player.id)) {
          rowsByPlayer.set(player.id, new Set());
        }
        rowsByPlayer.get(player.id)!.add(template.id);
      });

      if (rowsByPlayer.size === 0) {
        toast.error("匯入失敗：沒有有效的代號資料。");
        if (errors.length) setBulkImportSummary(errors.slice(0, 10).join("\n"));
        return;
      }

      const nowIso = new Date().toISOString();
      const templatePayload: any[] = [];

      rowsByPlayer.forEach((templateIds, playerId) => {
        templateIds.forEach((templateId) => {
          const template = slotTemplatesById.get(templateId);
          if (!template) return;
          templatePayload.push({
            event_id: eventId,
            player_id: playerId,
            day_of_week: template.day_of_week,
            start_time: template.start_time,
            end_time: template.end_time,
            reason: null,
            created_at: nowIso,
            updated_at: nowIso,
            code: template.code ?? null,
          });
        });
      });

      if (templatePayload.length === 0) {
        toast.error("匯入失敗：選手代號皆無對應的模板。");
        if (errors.length) setBulkImportSummary(errors.slice(0, 10).join("\n"));
        return;
      }

      const chunkSize = 100;
      for (let i = 0; i < templatePayload.length; i += chunkSize) {
        const chunk = templatePayload.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("team_blackout_templates")
          .upsert(chunk, { onConflict: "event_id, player_id, day_of_week, start_time, end_time" });
        if (error) throw error;
      }

      const { data: refreshedTemplates, error: refreshTemplatesError } = await supabase
        .from("team_blackout_templates")
        .select("*, player:players(id, name, department, seed)")
        .eq("event_id", eventId)
        .order("player_id", { ascending: true })
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (refreshTemplatesError) throw refreshTemplatesError;

      setBlackoutTemplates((refreshedTemplates as BlackoutTemplateRecord[]) || []);

      if (bulkImportGenerateAfter) {
        const generatePayload = [];
        const limit = blackoutLimit.trim() ? Number(blackoutLimit.trim()) : null;
        const weekCounts = buildExistingWeekCounts(blackouts);
        const skipped: string[] = [];
        const inserted: BlackoutRecord[] = [];

        const startDate = parseDateOnly(slotTemplateGenerateForm.startDate || formatDateKey(new Date()));
        const endDate = parseDateOnly(slotTemplateGenerateForm.endDate || formatDateKey(new Date(new Date().setMonth(new Date().getMonth() + 3))));

        const templatesForGeneration = ((refreshedTemplates as BlackoutTemplateRecord[]) || []).filter((template) =>
          rowsByPlayer.has(template.player_id),
        );

        for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
          const day = cursor.getDay();
          templatesForGeneration
            .filter((template) => template.day_of_week === day)
            .forEach((template) => {
              const playerId = template.player_id;
              if (!rowsByPlayer.has(playerId)) return;
              const weekKey = getWeekKey(cursor);
              if (limit !== null) {
                if (!weekCounts.has(playerId)) weekCounts.set(playerId, new Map());
                const playerMap = weekCounts.get(playerId)!;
                const count = playerMap.get(weekKey) || 0;
                if (count >= limit) {
                  skipped.push(`${playersById.get(playerId)?.name || "選手"} @ ${weekKey}`);
                  return;
                }
                playerMap.set(weekKey, count + 1);
              }

              const startIso = toISODateTime(cursor, template.start_time);
              const endIso = toISODateTime(cursor, template.end_time);

              generatePayload.push({
                event_id: eventId,
                player_id: playerId,
                start_time: startIso,
                end_time: endIso,
                reason: null,
                created_at: nowIso,
                updated_at: nowIso,
              });
            });
        }

        for (let i = 0; i < generatePayload.length; i += chunkSize) {
          const chunk = generatePayload.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from("team_blackouts")
            .insert(chunk)
            .select("*, player:players(id, name, department, seed)");

          if (error) throw error;
          inserted.push(...((data as BlackoutRecord[]) || []));
        }

        if (inserted.length > 0) {
          setBlackouts([...blackouts, ...inserted]);
        }

        if (skipped.length > 0) {
          console.warn("自動生成黑名單因每週上限略過：", skipped);
        }
      }

      const summaryMessage = `已匯入 ${templatePayload.length} 筆黑名單模板`;
      let combinedMessage = summaryMessage;
      if (errors.length) {
        combinedMessage += `，另有 ${errors.length} 筆失敗\n` + errors.slice(0, 10).join("\n");
        if (errors.length > 10) {
          combinedMessage += `\n… 其餘 ${errors.length - 10} 筆請檢查檔案`;
        }
      }
      setBulkImportSummary(combinedMessage);
      toast.success(summaryMessage);
    } catch (error: any) {
      console.error("Bulk import error", error);
      toast.error(error?.message || "匯入失敗");
    } finally {
      setBulkImporting(false);
      if (bulkFileRef.current) bulkFileRef.current.value = "";
    }
  };

  const handleAutoAssignSlotCodes = async () => {
    if (slots.length === 0) {
      toast("目前沒有任何時段可以編號。", { icon: "ℹ️" });
      return;
    }

    const prefix = slotCodePrefix.trim();
    const digitsValue = Number(slotCodeDigits);
    const digits = Number.isFinite(digitsValue) && digitsValue >= 0 ? Math.floor(digitsValue) : 0;
    const startValue = Number(slotCodeStart);
    const start = Number.isFinite(startValue) ? Math.floor(startValue) : 1;

    if (!prefix && digits <= 0) {
      toast.error("請設定代號前綴或有效的位數。至少需要其中一項。");
      return;
    }

    const sortedSlots = [...slots].sort((a, b) =>
      a.slot_date === b.slot_date
        ? a.start_time.localeCompare(b.start_time)
        : a.slot_date.localeCompare(b.slot_date),
    );

    const codes = sortedSlots.map((_, index) => {
      const serial = start + index;
      const padded = digits > 0 ? String(serial).padStart(digits, "0") : String(serial);
      return `${prefix}${digits > 0 ? padded : String(serial)}`;
    });

    const uniqueCount = new Set(codes).size;
    if (uniqueCount !== codes.length) {
      toast.error("產生的代號有重複，請調整前綴或位數。");
      return;
    }

    setAssigningSlotCodes(true);
    try {
      const updates = sortedSlots.map((slot, index) => ({ id: slot.id, code: codes[index] }));
      const chunkSize = 100;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize).map(({ id, code }) => ({ id, code }));
        const { error } = await supabase.from("event_slots").upsert(chunk, { onConflict: "id" });
        if (error) throw error;
      }

      const codeMap = new Map(updates.map(({ id, code }) => [id, code] as const));
      setSlots(slots.map((slot) => ({ ...slot, code: codeMap.get(slot.id) || slot.code })));
      toast.success(`已為 ${updates.length} 筆時段設定代號`);
    } catch (error: any) {
      console.error("Auto assign slot codes error", error);
      toast.error(error?.message || "設定代號失敗");
    } finally {
      setAssigningSlotCodes(false);
    }
  };

  const handleSlotTemplateImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSlotTemplateImporting(true);
    setSlotTemplateImportSummary(null);

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

      const [firstLine, ...rest] = lines;
      const hasHeader = firstLine.toLowerCase().includes("code");
      const dataLines = hasHeader ? rest : lines;

      if (dataLines.length === 0) {
        toast.error("找不到資料列");
        return;
      }

      const nowIso = new Date().toISOString();
      const errors: string[] = [];
      const rowsByCode = new Map<string, {
        code: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
        court_id: string | null;
        capacity: number | null;
        notes: string | null;
      }>();
      const duplicateCodes: string[] = [];

      dataLines.forEach((line, index) => {
        const parts = splitCsvLine(line);
        const rowNumber = hasHeader ? index + 2 : index + 1;

        if (parts.length < 4) {
          errors.push(`第 ${rowNumber} 行欄位不足（至少需要代號、星期、開始、結束）`);
          return;
        }

        const [codeRaw, dayRaw, startRaw, endRaw, courtRaw = "", capacityRaw = "", notesRaw = ""] = parts;

        const code = codeRaw.trim();
        if (!code) {
          errors.push(`第 ${rowNumber} 行缺少代號`);
          return;
        }

        const dayValue = parseWeekdayValue(dayRaw);
        if (dayValue === null) {
          errors.push(`第 ${rowNumber} 行的星期值無法解析：${dayRaw}`);
          return;
        }

        const startTime = normalizeTimeInput(startRaw);
        const endTime = normalizeTimeInput(endRaw);
        if (!startTime || !endTime) {
          errors.push(`第 ${rowNumber} 行時間格式錯誤（需 HH:MM 或 HH:MM:SS）`);
          return;
        }
        if (startTime >= endTime) {
          errors.push(`第 ${rowNumber} 行結束時間需晚於開始時間`);
          return;
        }

        const courtName = courtRaw.trim();
        let courtId: string | null = null;
        if (courtName) {
          const court = courtsByName.get(courtName.toLowerCase());
          if (!court) {
            errors.push(`第 ${rowNumber} 行找不到場地名稱：${courtName}`);
            return;
          }
          courtId = court.id;
        }

        const capacityTrimmed = capacityRaw.trim();
        let capacity: number | null = null;
        if (capacityTrimmed) {
          const value = Number(capacityTrimmed);
          if (Number.isNaN(value) || value < 1) {
            errors.push(`第 ${rowNumber} 行場數需為正整數`);
            return;
          }
          capacity = Math.floor(value);
        }

        const notes = notesRaw.trim() ? notesRaw.trim() : null;

        if (rowsByCode.has(code)) {
          duplicateCodes.push(code);
        }

        rowsByCode.set(code, {
          code,
          day_of_week: dayValue,
          start_time: startTime,
          end_time: endTime,
          court_id: courtId,
          capacity,
          notes,
        });
      });

      const rows = Array.from(rowsByCode.values());

      if (rows.length === 0) {
        toast.error("沒有可匯入的模板資料");
        if (errors.length) setSlotTemplateImportSummary(errors.slice(0, 10).join("\n"));
        return;
      }

      if (slotTemplateImportReplace) {
        const { error: deleteError } = await supabase
          .from("event_slot_templates")
          .delete()
          .eq("event_id", eventId);
        if (deleteError) throw deleteError;
      }

      const payload = rows.map((row) => ({
        event_id: eventId,
        code: row.code,
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        court_id: row.court_id,
        capacity: row.capacity,
        notes: row.notes,
        created_at: nowIso,
        updated_at: nowIso,
      }));

      const chunkSize = 100;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("event_slot_templates")
          .upsert(chunk, { onConflict: "event_id,code" });
        if (error) throw error;
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from("event_slot_templates")
        .select("*, court:event_courts(*)")
        .eq("event_id", eventId)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (refreshError) throw refreshError;

      setSlotTemplates((refreshed as SlotTemplateRecord[]) || []);
      const duplicateMessage = duplicateCodes.length
        ? `；偵測到重複代號 ${Array.from(new Set(duplicateCodes)).join(", ")}，以最後一筆覆蓋`
        : "";
      setSlotTemplateImportSummary(
        `成功匯入 ${rows.length} 筆模板${errors.length ? `，另有 ${errors.length} 筆失敗` : ""}${duplicateMessage}`,
      );
      if (errors.length) {
        console.warn("Slot template import skipped:", errors);
      }
      toast.success(`已匯入 ${rows.length} 筆每週時段模板`);
    } catch (error: any) {
      console.error("Slot template import error", error);
      const friendlyMessage =
        error?.message || error?.details || error?.hint || JSON.stringify(error);
      toast.error(`匯入失敗：${friendlyMessage}`);
    } finally {
      setSlotTemplateImporting(false);
      if (slotTemplateFileRef.current) slotTemplateFileRef.current.value = "";
    }
  };

  const applySlotTemplateToBlackoutTemplateForm = (templateId: string) => {
    setBlackoutTemplateForm((prev) => ({
      ...prev,
      slotTemplateId: templateId,
    }));
  };

  return (
    <div className="space-y-10">
      {/* Navigation Menu */}
      <nav className="sticky top-4 z-10 bg-white rounded-xl shadow-lg p-4 border-2 border-gray-200">
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <span className="text-sm font-semibold text-gray-700 mr-2">快速導航：</span>
          <a
            href="#blackout-limit"
            className="px-3 py-1.5 text-sm font-medium text-white bg-ntu-green rounded-lg hover:opacity-90 transition-opacity"
          >
            上限設定
          </a>
          <a
            href="#courts"
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            場地管理
          </a>
          <a
            href="#slot-templates"
            className="px-3 py-1.5 text-sm font-medium text-white bg-purple-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            時段模板
          </a>
          <a
            href="#available-slots"
            className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            可用時段
          </a>
          <a
            href="#team-blackouts"
            className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:opacity-90 transition-opacity"
          >
            不可出賽
          </a>
        </div>
      </nav>

      <section id="blackout-limit" className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 scroll-mt-24">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-200">
          <div className="w-1 h-8 bg-ntu-green rounded"></div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ntu-green">不可出賽時段上限</h2>
            <p className="text-sm text-gray-600 mt-1">
              主辦方可以限制每個隊伍可提交的不可出賽時段數量（每週）。若留空則不限制。
            </p>
          </div>
        </div>
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

      <section id="courts" className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 scroll-mt-24">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-gray-200">
          <div className="w-1 h-8 bg-blue-500 rounded"></div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ntu-green">場地管理</h2>
            <p className="text-sm text-gray-600 mt-1">
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

      <section id="slot-templates" className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 space-y-8 scroll-mt-24">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-gray-200">
          <div className="w-1 h-8 bg-purple-500 rounded"></div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ntu-green">每週比賽時段模板</h2>
            <p className="text-sm text-gray-600 mt-1">
              設定每週固定的可用時段後，就能一次生成整個賽季的時段，僅需針對少數例外手動調整。
            </p>
          </div>
        </div>

        <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 mb-6 bg-purple-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">📥 匯入每週模板（含代號）</h3>
              <p className="text-sm text-gray-600">
                CSV 欄位順序：<span className="font-mono">code,weekday,start_time,end_time,court,capacity,notes</span>。
                星期可使用 0-6、Mon、週一 等表示。時間採 <span className="font-mono">HH:MM</span> 格式。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={slotTemplateImportReplace}
                  onChange={(e) => setSlotTemplateImportReplace(e.target.checked)}
                  className="h-4 w-4"
                />
                匯入前清空既有模板
              </label>
              <input
                ref={slotTemplateFileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleSlotTemplateImport}
                disabled={slotTemplateImporting}
                className="text-sm"
              />
            </div>
          </div>
          {slotTemplateImportSummary && (
            <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">
              {slotTemplateImportSummary}
            </div>
          )}
        </div>

        <form onSubmit={handleAddSlotTemplate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">代號</label>
            <input
              type="text"
              value={slotTemplateForm.code}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, code: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：SLOT-A"
              maxLength={20}
            />
          </div>
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
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                          代號：{getSlotCodeFromTemplate(template)}
                        </span>
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

        <div className="mt-4 border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">🔢 自動產生時段代號</h3>
              <p className="text-sm text-gray-600">
                依日期順序自動分配代號，方便後續排程以編號為主。已有代號的時段也會被新設定覆蓋。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">前綴</label>
                <input
                  type="text"
                  value={slotCodePrefix}
                  onChange={(e) => setSlotCodePrefix(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                  maxLength={10}
                  placeholder="例如：S"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">流水號位數</label>
                <input
                  type="number"
                  min={0}
                  value={slotCodeDigits}
                  onChange={(e) => setSlotCodeDigits(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                  placeholder="3"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">起始號碼</label>
                <input
                  type="number"
                  value={slotCodeStart}
                  onChange={(e) => setSlotCodeStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                  placeholder="1"
                />
              </div>
              <button
                type="button"
                onClick={handleAutoAssignSlotCodes}
                disabled={assigningSlotCodes}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {assigningSlotCodes ? "產生中..." : "自動產生代號"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="available-slots" className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 scroll-mt-24">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-gray-200">
          <div className="w-1 h-8 bg-indigo-500 rounded"></div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ntu-green">所有可用時段</h2>
            <p className="text-sm text-gray-600 mt-1">
              自動生成後仍可針對個別時段調整或刪除，確保最終排程精準。
            </p>
          </div>
        </div>

        <form onSubmit={handleAddSlot} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">代號</label>
            <input
              type="text"
              value={slotForm.code}
              onChange={(e) => setSlotForm({ ...slotForm, code: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：S001"
              maxLength={20}
            />
          </div>
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
                        {slot.code && (
                          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                            代號：{slot.code}
                          </span>
                        )}
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

      <section id="team-blackouts" className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 space-y-8 scroll-mt-24">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-gray-200">
          <div className="w-1 h-8 bg-orange-500 rounded"></div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ntu-green">隊伍不可出賽時段</h2>
            <p className="text-sm text-gray-600 mt-1">
              每週模板 + 大量匯入，快速蒐集各隊的不能出賽時間，排程器會自動避開。
            </p>
          </div>
        </div>

        <div className="rounded-lg border-2 border-dashed border-orange-300 p-4 bg-orange-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">📥 大量匯入不可出賽代號</h3>
              <p className="text-sm text-gray-600">
                CSV 欄位順序：<span className="font-mono">player_name,slot_code</span>。每一列代表該選手每週同時段皆不可比賽，slot code 需對應到「每週時段模板」中的代號。
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
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={bulkImportReplaceTemplates}
                onChange={(e) => setBulkImportReplaceTemplates(e.target.checked)}
                className="h-4 w-4"
              />
              匯入前清空現有的黑名單模板
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={bulkImportGenerateAfter}
                onChange={(e) => setBulkImportGenerateAfter(e.target.checked)}
                className="h-4 w-4"
              />
              匯入後立即套用至整個賽季
            </label>
          </div>
          {bulkImportSummary && (
            <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">
              {bulkImportSummary}
            </div>
          )}
        </div>

        <form onSubmit={handleAddBlackoutTemplate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <label className="text-sm font-medium text-gray-700 mb-1">時段代號 *</label>
            <select
              value={blackoutTemplateForm.slotTemplateId}
              onChange={(e) => applySlotTemplateToBlackoutTemplateForm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            >
              <option value="">請選擇</option>
              {slotTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.code || WEEKDAY_LABELS[template.day_of_week]}
                </option>
              ))}
            </select>
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
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                          代號：{getSlotCodeFromTemplate(template)}
                        </span>
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

        <form onSubmit={handleAddBlackoutTemplate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">選手 *</label>
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
            <label className="text-sm font-medium text-gray-700 mb-1">時段代號 *</label>
            <select
              value={blackoutTemplateForm.slotTemplateId}
              onChange={(e) => applySlotTemplateToBlackoutTemplateForm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            >
              <option value="">請選擇</option>
              {slotTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.code || WEEKDAY_LABELS[template.day_of_week]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={submittingBlackoutTemplate}
              className="w-full sm:w-auto bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submittingBlackoutTemplate ? "新增中..." : "新增黑名單"}
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
                  <th className="px-4 py-2 text-left">時段代號</th>
                  <th className="px-4 py-2 text-left">日期</th>
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
                        {getSlotCodeFromTemplate(item)}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(item.start_time).toLocaleDateString("zh-TW")}
                      </td>
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
