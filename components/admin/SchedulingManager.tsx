"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import ScheduleInputTimezoneField from "@/components/admin/ScheduleInputTimezoneField";
import {
  convertWeeklySlotTemplateTimesToTaipei,
  readStoredScheduleInputTimezone,
  writeStoredScheduleInputTimezone,
  DEFAULT_SCHEDULE_INPUT_TIMEZONE,
} from "@/lib/utils/adminScheduleTimezone";
import {
  EventCourt,
  EventSlot,
  EventSlotTemplate,
} from "@/types/database";
import SchedulePreviewEditor from "@/components/admin/SchedulePreviewEditor";
import { useI18n } from "@/lib/i18n/context";

type SlotRecord = EventSlot & { court?: EventCourt | null };
type SlotTemplateRecord = EventSlotTemplate & { court?: EventCourt | null };

interface SchedulingManagerProps {
  eventId: string;
  initialCourts: EventCourt[];
  initialSlots: SlotRecord[];
  initialSlotTemplates: SlotTemplateRecord[];
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
  initialSlotTemplates,
}: SchedulingManagerProps) {
  const supabase = createClient();
  const { t } = useI18n();
  const WEEKDAY_LABELS = [t("admin.weekday0"), t("admin.weekday1"), t("admin.weekday2"), t("admin.weekday3"), t("admin.weekday4"), t("admin.weekday5"), t("admin.weekday6")];

  const [courts, setCourts] = useState<EventCourt[]>(initialCourts);
  const [slots, setSlots] = useState<SlotRecord[]>(initialSlots);
  const [slotTemplates, setSlotTemplates] = useState<SlotTemplateRecord[]>(initialSlotTemplates);

  const [slotForm, setSlotForm] = useState<SlotFormState>(emptySlotForm);
  const [courtForm, setCourtForm] = useState<CourtFormState>(emptyCourtForm);
  const [slotTemplateForm, setSlotTemplateForm] = useState<SlotTemplateFormState>(emptySlotTemplateForm);
  const [slotTemplateGenerateForm, setSlotTemplateGenerateForm] = useState<SlotTemplateGenerateFormState>(emptySlotTemplateGenerateForm);

  const [submittingSlot, setSubmittingSlot] = useState(false);
  const [submittingCourt, setSubmittingCourt] = useState(false);
  const [submittingSlotTemplate, setSubmittingSlotTemplate] = useState(false);
  const [generatingSlots, setGeneratingSlots] = useState(false);
  const [deletingAllSlots, setDeletingAllSlots] = useState(false);
  const [slotTemplateImporting, setSlotTemplateImporting] = useState(false);
  const [slotTemplateImportSummary, setSlotTemplateImportSummary] = useState<string | null>(null);
  const [slotTemplateImportReplace, setSlotTemplateImportReplace] = useState(false);
  const [slotTemplateImportTz, setSlotTemplateImportTz] = useState(DEFAULT_SCHEDULE_INPUT_TIMEZONE);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [autoScheduleClearExisting, setAutoScheduleClearExisting] = useState(false);
  const [minSlotsBetweenSameTeam, setMinSlotsBetweenSameTeam] = useState(1);
  const [minDaysBetweenSameTeam, setMinDaysBetweenSameTeam] = useState(1);
  const [schedulePreviewData, setSchedulePreviewData] = useState<{
    slots: { id: string; slot_date: string; start_time: string; end_time: string; capacity: number }[];
    matches: { id: string; round: number; match_number: number; player1_name: string; player2_name: string }[];
    assignments: { matchId: string; slotId: string; scheduledTime: string }[];
    unassignedIds: string[];
  } | null>(null);

  const slotTemplateFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSlotTemplateImportTz(readStoredScheduleInputTimezone());
  }, []);

  const handleSlotTemplateImportTzChange = (next: string) => {
    writeStoredScheduleInputTimezone(next);
    setSlotTemplateImportTz(next);
  };

  const courtsByName = useMemo(() => {
    const map = new Map<string, EventCourt>();
    courts.forEach((court) => {
      if (court.name) {
        map.set(court.name.trim().toLowerCase(), court);
      }
    });
    return map;
  }, [courts]);

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

  const getSlotCodeFromTemplate = useCallback(
    (template: Pick<SlotTemplateRecord, "day_of_week" | "start_time" | "end_time">) => {
      const key = `${template.day_of_week}-${template.start_time.slice(0, 5)}-${template.end_time.slice(0, 5)}`;
      const match = slotTemplatesByKey.get(key);
      return match?.code || WEEKDAY_LABELS[template.day_of_week];
    },
    [slotTemplatesByKey],
  );

  const handleAddCourt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!courtForm.name.trim()) {
      toast.error(t("admin.scheduling.enterCourtName"));
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
      toast.success(t("admin.scheduling.courtAddedSuccess"));
    } catch (error: any) {
      console.error("Add court error", error);
      toast.error(error?.message || t("admin.error"));
    } finally {
      setSubmittingCourt(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    if (!confirm(t("admin.scheduling.confirmDeleteCourt"))) {
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

      toast.success(t("admin.scheduling.courtDeleted"));
    } catch (error: any) {
      console.error("Delete court error", error);
      toast.error(error?.message || t("admin.error"));
    }
  };

  const handleAddSlot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slotForm.date || !slotForm.start || !slotForm.end) {
      toast.error(t("admin.scheduling.fillDateAndTime"));
      return;
    }

    const start = parseTime(slotForm.start);
    const end = parseTime(slotForm.end);
    if (start >= end) {
      toast.error(t("admin.scheduling.endAfterStart"));
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
      toast.success(t("admin.scheduling.slotAddedSuccess"));
    } catch (error: any) {
      console.error("Add slot error", error);
      toast.error(error?.message || t("admin.error"));
    } finally {
      setSubmittingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm(t("admin.scheduling.confirmDeleteSlot"))) {
      return;
    }

    try {
      const { error } = await supabase
        .from("event_slots")
        .delete()
        .eq("id", slotId);

      if (error) throw error;

      setSlots(slots.filter((slot) => slot.id !== slotId));
      toast.success(t("admin.scheduling.slotDeleted"));
    } catch (error: any) {
      console.error("Delete slot error", error);
      toast.error(error?.message || t("admin.error"));
    }
  };

  const handleDeleteAllSlots = async () => {
    if (slots.length === 0) {
      toast(t("admin.scheduling.noSlotsToDelete"), { icon: "ℹ️" });
      return;
    }
    if (!confirm(t("admin.scheduling.confirmDeleteAllSlots", { n: slots.length }))) {
      return;
    }
    setDeletingAllSlots(true);
    try {
      const { error } = await supabase
        .from("event_slots")
        .delete()
        .eq("event_id", eventId);
      if (error) throw error;
      setSlots([]);
      toast.success(t("admin.scheduling.allSlotsDeleted"));
    } catch (error: any) {
      console.error("Delete all slots error", error);
      toast.error(error?.message || t("admin.error"));
    } finally {
      setDeletingAllSlots(false);
    }
  };

  const handleAddSlotTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slotTemplateForm.start || !slotTemplateForm.end) {
      toast.error(t("admin.scheduling.fillStartEnd"));
      return;
    }

    const start = parseTime(slotTemplateForm.start);
    const end = parseTime(slotTemplateForm.end);
    if (start >= end) {
      toast.error(t("admin.scheduling.endAfterStart"));
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
      toast.success(t("admin.scheduling.templateAdded"));
    } catch (error: any) {
      console.error("Add slot template error", error);
      toast.error(error?.message || t("admin.error"));
    } finally {
      setSubmittingSlotTemplate(false);
    }
  };

  const handleDeleteSlotTemplate = async (templateId: string) => {
    if (!confirm(t("admin.scheduling.confirmDeleteTemplate"))) return;
    try {
      const { error } = await supabase
        .from("event_slot_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setSlotTemplates(slotTemplates.filter((template) => template.id !== templateId));
      toast.success(t("admin.scheduling.templateDeleted"));
    } catch (error: any) {
      console.error("Delete slot template error", error);
      toast.error(error?.message || t("admin.error"));
    }
  };

  const handleGenerateSlotsFromTemplates = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slotTemplateGenerateForm.startDate || !slotTemplateGenerateForm.endDate) {
      toast.error(t("admin.scheduling.selectDateRange"));
      return;
    }

    if (slotTemplates.length === 0) {
      toast.error(t("admin.scheduling.addOneTemplateFirst"));
      return;
    }

    const startDate = parseDateOnly(slotTemplateGenerateForm.startDate);
    const endDate = parseDateOnly(slotTemplateGenerateForm.endDate);
    if (startDate > endDate) {
      toast.error(t("admin.scheduling.endAfterStartDate"));
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
      toast(t("admin.scheduling.noNewSlots"), { icon: "ℹ️" });
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
      toast.success(t("admin.scheduling.slotsGeneratedCount", { n: inserted.length }));
    } catch (error: any) {
      console.error("Generate slots error", error);
      toast.error(error?.message || t("admin.error"));
    } finally {
      setGeneratingSlots(false);
    }
  };

  const downloadSlotTemplateSample = () => {
    const header = "code,weekday,start_time,end_time,court,capacity,notes";
    const rows = [
      "Mon-18,1,18:00,20:00,,,",
      "Wed-18,3,18:00,20:00,,,",
      "Fri-14,5,14:00,17:00,,1,週五下午場",
    ];
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("admin.scheduling.sampleFileName");
    a.click();
    URL.revokeObjectURL(url);
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

        const converted = convertWeeklySlotTemplateTimesToTaipei(
          dayValue,
          startTime,
          endTime,
          slotTemplateImportTz,
        );
        if (!converted.ok) {
          errors.push(`第 ${rowNumber} 行：${converted.reason}`);
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
          day_of_week: converted.day_of_week,
          start_time: converted.start_time,
          end_time: converted.end_time,
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

  const handlePreviewSchedule = async () => {
    setAutoScheduling(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/auto-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: true,
          clearExisting: autoScheduleClearExisting,
          minSlotsBetweenSameTeam,
          minDaysBetweenSameTeam,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || t("admin.error"));
        return;
      }
      if (data.dryRun && data.slots && data.assignments && data.matches) {
        setSchedulePreviewData({
          slots: data.slots,
          matches: data.matches,
          assignments: data.assignments,
          unassignedIds: data.unassigned ?? [],
        });
      }
    } catch (e: any) {
      toast.error(e?.message || t("admin.error"));
    } finally {
      setAutoScheduling(false);
    }
  };

  const handleAutoSchedule = async () => {
    setAutoScheduling(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/auto-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearExisting: autoScheduleClearExisting,
          minSlotsBetweenSameTeam,
          minDaysBetweenSameTeam,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || t("admin.error"));
        return;
      }
      toast.success(data.message);
      if (data.assigned > 0) {
        window.location.href = `/admin/${eventId}/matches`;
      }
    } catch (e: any) {
      toast.error(e?.message || t("admin.error"));
    } finally {
      setAutoScheduling(false);
    }
  };

  return (
    <div className="grid gap-10">
      <section id="courts" className="order-1 bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 scroll-mt-24">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-gray-200">
          <div className="w-1 h-8 bg-blue-500 rounded"></div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ntu-green">{t('admin.scheduling.manageCourts')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('admin.scheduling.courtsIntro')}
            </p>
          </div>
        </div>

        <form onSubmit={handleAddCourt} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.courtName')} *</label>
            <input
              type="text"
              value={courtForm.name}
              onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="e.g. Court 1"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.courtType')}</label>
            <input
              type="text"
              value={courtForm.surface}
              onChange={(e) => setCourtForm({ ...courtForm, surface: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="例如：Hard Court"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.notes')}</label>
            <input
              type="text"
              value={courtForm.notes}
              onChange={(e) => setCourtForm({ ...courtForm, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder={t('admin.scheduling.notes')}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={submittingCourt}
              className="w-full sm:w-auto bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submittingCourt ? t('admin.loading') : t('admin.scheduling.addCourt')}
            </button>
          </div>
        </form>

        {courts.length === 0 ? (
          <p className="text-sm text-gray-500">{t('admin.scheduling.noCourtsYet')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">{t('admin.scheduling.name')}</th>
                  <th className="px-4 py-2 text-left">{t('admin.scheduling.type')}</th>
                  <th className="px-4 py-2 text-left">{t('admin.scheduling.notes')}</th>
                  <th className="px-4 py-2 text-right">{t('admin.scheduling.actions')}</th>
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
                        {t('admin.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="slot-templates" className="order-2 bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 space-y-8 scroll-mt-24">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-gray-200">
          <div className="w-1 h-8 bg-purple-500 rounded"></div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ntu-green">{t('admin.scheduling.templates')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('admin.scheduling.templatesIntro')}
            </p>
          </div>
        </div>

        <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 mb-6 bg-purple-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800">{t('admin.scheduling.importCsv')}</h3>
              <p className="text-sm text-gray-600">
                <strong>{t('admin.scheduling.dataStructure')}</strong>
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
                <li><span className="font-mono">code</span> — {t('admin.scheduling.code')}</li>
                <li><span className="font-mono">weekday</span> — {t('admin.scheduling.dayOfWeek')}: 0–6</li>
                <li><span className="font-mono">start_time, end_time</span> — HH:MM</li>
                <li><span className="font-mono">court, capacity, notes</span> — {t('admin.scheduling.notes')}</li>
              </ul>
              <div className="mt-3 max-w-md">
                <ScheduleInputTimezoneField
                  id="schedule-slot-template-import-tz"
                  value={slotTemplateImportTz}
                  onChange={handleSlotTemplateImportTzChange}
                  locale="zh"
                  labelZh="CSV 內 start／end 的時區"
                  hintZh="每週星期與起迄時間依此時區解讀，匯入後換算成台灣時間存檔（與其他賽程匯入共用此選項）。變更後請重新選擇檔案。"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={downloadSlotTemplateSample}
                className="text-sm font-medium text-purple-700 hover:text-purple-800 underline"
              >
                {t('admin.scheduling.downloadSampleCsv')}
              </button>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={slotTemplateImportReplace}
                  onChange={(e) => setSlotTemplateImportReplace(e.target.checked)}
                  className="h-4 w-4"
                />
                {t('admin.scheduling.clearTemplatesOnImport')}
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
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.code')}</label>
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
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.dayOfWeek')} *</label>
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
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.startTime')} *</label>
            <input
              type="time"
              value={slotTemplateForm.start}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.endTime')} *</label>
            <input
              type="time"
              value={slotTemplateForm.end}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.courtName')}</label>
            <select
              value={slotTemplateForm.courtId}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, courtId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="">{t('admin.scheduling.unspecified')}</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.concurrentMatches')}</label>
            <input
              type="number"
              min={1}
              value={slotTemplateForm.capacity}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, capacity: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder={t('admin.scheduling.defaultOne')}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.notes')}</label>
            <input
              type="text"
              value={slotTemplateForm.notes}
              onChange={(e) => setSlotTemplateForm({ ...slotTemplateForm, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder={t('admin.scheduling.notes')}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={submittingSlotTemplate}
              className="w-full bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submittingSlotTemplate ? t('admin.loading') : t('admin.add')}
            </button>
          </div>
        </form>

        {slotTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">{t('admin.scheduling.noSlotsYet')}</p>
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
                          {t('admin.scheduling.code')}: {getSlotCodeFromTemplate(template)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSlotTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 font-semibold"
                      >
                        {t('admin.delete')}
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
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.applyDateStart')}</label>
            <input
              type="date"
              value={slotTemplateGenerateForm.startDate}
              onChange={(e) => setSlotTemplateGenerateForm({ ...slotTemplateGenerateForm, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.applyDateEnd')}</label>
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
            {t('admin.scheduling.overwriteExisting')}
          </label>
          <button
            type="submit"
            disabled={generatingSlots}
            className="bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generatingSlots ? t('admin.scheduling.generating') : t('admin.scheduling.generateFromTemplates')}
          </button>
        </form>
      </section>

      <section id="available-slots" className="order-3 bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 scroll-mt-24">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-gray-200">
          <div className="w-1 h-8 bg-indigo-500 rounded"></div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ntu-green">{t('admin.scheduling.availableSlots')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('admin.scheduling.availableSlotsIntro')}
            </p>
          </div>
          {slots.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAllSlots}
              disabled={deletingAllSlots}
              className="shrink-0 px-4 py-2 rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              {deletingAllSlots ? t('admin.loading') : t('admin.scheduling.deleteAll')}
            </button>
          )}
        </div>

        <form onSubmit={handleAddSlot} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.code')}</label>
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
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.dateRequired')}</label>
            <input
              type="date"
              value={slotForm.date}
              onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.startTimeRequired')}</label>
            <input
              type="time"
              value={slotForm.start}
              onChange={(e) => setSlotForm({ ...slotForm, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.endTimeRequired')}</label>
            <input
              type="time"
              value={slotForm.end}
              onChange={(e) => setSlotForm({ ...slotForm, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.courtName')}</label>
            <select
              value={slotForm.courtId}
              onChange={(e) => setSlotForm({ ...slotForm, courtId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="">{t('admin.scheduling.unspecified')}</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.concurrentMatches')}</label>
            <input
              type="number"
              min={1}
              value={slotForm.capacity}
              onChange={(e) => setSlotForm({ ...slotForm, capacity: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder={t('admin.scheduling.defaultOne')}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">{t('admin.scheduling.notes')}</label>
            <input
              type="text"
              value={slotForm.notes}
              onChange={(e) => setSlotForm({ ...slotForm, notes: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder={t('admin.scheduling.notes')}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={submittingSlot}
              className="w-full sm:w-auto bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submittingSlot ? t('admin.loading') : t('admin.add')}
            </button>
          </div>
        </form>

        {slots.length === 0 ? (
          <p className="text-sm text-gray-500">{t('admin.scheduling.noSlotsYet')}</p>
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
                            {t('admin.scheduling.code')}: {slot.code}
                          </span>
                        )}
                        <span className="font-semibold text-gray-700">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                        <span className="text-gray-600">
                          {t('admin.scheduling.courtLabelShort')}{slot.court?.name || "—"}
                          {slot.capacity ? ` | ${t('admin.scheduling.concurrentCount', { n: slot.capacity })}` : ""}
                        </span>
                        {slot.notes && <span className="text-gray-500">{t('admin.scheduling.notes')}: {slot.notes}</span>}
                      </div>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-semibold"
                      >
                        {t('admin.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="auto-schedule" className="order-4 bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200 scroll-mt-24">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-gray-200">
          <div className="w-1 h-8 bg-emerald-600 rounded"></div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ntu-green">{t('admin.scheduling.autoSchedule')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('admin.scheduling.autoScheduleIntro')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>{t('admin.scheduling.sameTeamMinSlots')}</span>
            <select
              value={minSlotsBetweenSameTeam}
              onChange={(e) => setMinSlotsBetweenSameTeam(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={0}>{t('admin.scheduling.slot0')}</option>
              <option value={1}>{t('admin.scheduling.slot1')}</option>
              <option value={2}>{t('admin.scheduling.slot2')}</option>
            </select>
            <span>{t('admin.scheduling.daysBetween')}</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span>{t('admin.scheduling.sameTeamMinDays')}</span>
            <select
              value={minDaysBetweenSameTeam}
              onChange={(e) => setMinDaysBetweenSameTeam(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={0}>{t('admin.scheduling.day0')}</option>
              <option value={1}>{t('admin.scheduling.day1')}</option>
              <option value={2}>{t('admin.scheduling.day2')}</option>
            </select>
            <span>{t('admin.scheduling.daysBetween')}</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoScheduleClearExisting}
              onChange={(e) => setAutoScheduleClearExisting(e.target.checked)}
              className="h-4 w-4"
            />
            {t('admin.scheduling.clearExisting')}
          </label>
          <button
            type="button"
            onClick={handlePreviewSchedule}
            disabled={autoScheduling}
            className="bg-emerald-700 text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {autoScheduling ? t('admin.loading') : t('admin.scheduling.previewSchedule')}
          </button>
          <button
            type="button"
            onClick={handleAutoSchedule}
            disabled={autoScheduling}
            className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {autoScheduling ? t('admin.loading') : t('admin.scheduling.directSchedule')}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {t('admin.scheduling.previewDragHint')}
        </p>
      </section>

      {schedulePreviewData && (
        <SchedulePreviewEditor
          eventId={eventId}
          slots={schedulePreviewData.slots}
          matches={schedulePreviewData.matches}
          initialAssignments={schedulePreviewData.assignments}
          initialUnassignedIds={schedulePreviewData.unassignedIds}
          onClose={() => setSchedulePreviewData(null)}
          onSaved={() => { setSchedulePreviewData(null); window.location.href = `/admin/${eventId}/matches`; }}
        />
      )}
    </div>
  );
}
