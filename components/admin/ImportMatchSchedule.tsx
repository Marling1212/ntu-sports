"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Player } from "@/types/database";
import {
  parseCsvScheduleFirstColumnToUtcIso,
  readStoredScheduleInputTimezone,
  writeStoredScheduleInputTimezone,
  DEFAULT_SCHEDULE_INPUT_TIMEZONE,
} from "@/lib/utils/adminScheduleTimezone";
import ScheduleInputTimezoneField from "@/components/admin/ScheduleInputTimezoneField";

interface ImportMatchScheduleProps {
  eventId: string;
  players: Player[];
}

interface ParsedRow {
  date: string | null; // null means TBD or not specified
  /** YYYY-MM-DD only → sequential slots that day; includes time → match nearest slot by clock */
  datePrecision: "day" | "minute" | null;
  teamA: string;
  teamB: string;
  scoreA?: string;
  scoreB?: string;
  additional?: string[];
  sourceLine: number;
}

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

const normalizeName = (name: string) =>
  name
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const determineStatusAndWinner = (
  scoreA: string | undefined,
  scoreB: string | undefined,
  playerAId?: string,
  playerBId?: string,
): { status: "upcoming" | "completed"; winnerId?: string | null } => {
  if (!scoreA || !scoreB) {
    return { status: "upcoming" };
  }

  const numA = Number(scoreA);
  const numB = Number(scoreB);

  if (Number.isNaN(numA) || Number.isNaN(numB)) {
    return { status: "upcoming" };
  }

  if (numA === numB) {
    return { status: "completed", winnerId: null };
  }

  if (numA > numB) {
    return { status: "completed", winnerId: playerAId || null };
  }

  return { status: "completed", winnerId: playerBId || null };
};

export default function ImportMatchSchedule({ eventId, players }: ImportMatchScheduleProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [replaceRegularSeason, setReplaceRegularSeason] = useState(true);
  const [roundValue, setRoundValue] = useState("0");
  const [importTimeZone, setImportTimeZone] = useState(DEFAULT_SCHEDULE_INPUT_TIMEZONE);

  useEffect(() => {
    setImportTimeZone(readStoredScheduleInputTimezone());
  }, []);

  const handleImportTimeZoneChange = (z: string) => {
    writeStoredScheduleInputTimezone(z);
    setImportTimeZone(z);
  };

  const playersByName = useMemo(() => {
    const map = new Map<string, Player>();
    players.forEach((player) => {
      map.set(normalizeName(player.name), player);
    });
    return map;
  }, [players]);

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const parseCsv = (text: string, timeZone: string): ParsedRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    const parsedRows: ParsedRow[] = [];

    lines.forEach((line, index) => {
      const rowNumber = index + 1;
      const parts = splitCsvLine(line);

      if (parts.length === 0) return;

      const firstCell = parts[0]?.trim();

      // Skip week headers or other non-date rows
      if (!firstCell) return;
      if (/^week/i.test(firstCell)) return;

      const strictDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(firstCell);
      const parsedIso = parseCsvScheduleFirstColumnToUtcIso(firstCell, timeZone);
      let date: string | null = parsedIso;
      let datePrecision: "day" | "minute" | null = null;
      if (parsedIso) {
        datePrecision = strictDateOnly ? "day" : "minute";
      }

      let teamA: string;
      let teamB: string;

      if (date) {
        teamA = parts[1]?.trim() || "";
        teamB = parts[2]?.trim() || "";
      } else {
        teamA = firstCell;
        teamB = parts[1]?.trim() || "";
      }

      // Require both teams to proceed
      if (!teamA || !teamB) return;

      const scoreIndex = date ? 3 : 2;
      const scoreA = parts[scoreIndex]?.trim() || undefined;
      const scoreB = parts[scoreIndex + 1]?.trim() || undefined;
      const additional = parts.slice(scoreIndex + 2);

      parsedRows.push({
        date,
        datePrecision,
        teamA,
        teamB,
        scoreA,
        scoreB,
        additional,
        sourceLine: rowNumber,
      });
    });

    return parsedRows;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSummary(null);

    try {
      setImporting(true);
      const text = await file.text();
      const rows = parseCsv(text, importTimeZone);

      if (rows.length === 0) {
        toast.error("檔案內沒有可匯入的賽程資料");
        return;
      }

      const round = Number(roundValue);
      if (Number.isNaN(round) || round < 0) {
        toast.error("請輸入有效的輪次數值 (0 或以上)");
        return;
      }

      // Fetch existing time slots for this event to match dates (include court info)
      const { data: slots, error: slotsError } = await supabase
        .from("event_slots")
        .select(`
          *,
          event_courts!event_slots_court_id_fkey(name)
        `)
        .eq("event_id", eventId)
        .order("slot_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (slotsError) {
        console.warn("Could not fetch slots:", slotsError);
      }

      // Create a map of slots by date (YYYY-MM-DD), each array already sorted by start_time from query
      const slotsByDate = new Map<string, any[]>();
      slots?.forEach((slot) => {
        const dateStr = slot.slot_date; // Already in YYYY-MM-DD format
        if (!slotsByDate.has(dateStr)) {
          slotsByDate.set(dateStr, []);
        }
        slotsByDate.get(dateStr)!.push(slot);
      });

      // Minutes from midnight for slot start_time (HH:MM or HH:MM:SS)
      const slotStartMinutes = (slot: any): number => {
        const t = slot.start_time || "00:00:00";
        const [h, m] = t.split(":").map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
      };

      const buildSlotResult = (slot: any): { scheduledTime: string; slotId: string; court?: string } => {
        const result: { scheduledTime: string; slotId: string; court?: string } = {
          scheduledTime: `${slot.slot_date}T${slot.start_time}+08:00`,
          slotId: slot.id,
        };
        if (slot.event_courts) {
          const courtName = Array.isArray(slot.event_courts)
            ? slot.event_courts[0]?.name
            : slot.event_courts?.name;
          if (courtName) result.court = courtName;
        }
        return result;
      };

      // Per-date usage index: when CSV has date-only, assign slots in order (1st row → 1st slot, 2nd → 2nd, ...)
      const slotUsageByDate = new Map<string, number>();
      const overflowWarnedForDate = new Set<string>();

      const matchDateToSlot = (
        dateIso: string,
        precision: "day" | "minute",
      ): { scheduledTime: string; slotId: string; court?: string } | null => {
        const dt = DateTime.fromISO(dateIso, { setZone: true });
        if (!dt.isValid) return null;
        const tpe = dt.setZone("Asia/Taipei");
        const dateOnly = tpe.toFormat("yyyy-MM-dd");
        const slotsForDate = slotsByDate.get(dateOnly);
        if (!slotsForDate || slotsForDate.length === 0) return null;

        const timeMinutes = tpe.hour * 60 + tpe.minute;
        const hasExplicitTime = precision === "minute";

        if (hasExplicitTime) {
          let best = slotsForDate[0];
          let bestDiff = Math.abs(slotStartMinutes(best) - timeMinutes);
          for (let i = 1; i < slotsForDate.length; i++) {
            const diff = Math.abs(slotStartMinutes(slotsForDate[i]) - timeMinutes);
            if (diff < bestDiff) {
              bestDiff = diff;
              best = slotsForDate[i];
            }
          }
          return buildSlotResult(best);
        }

        const index = slotUsageByDate.get(dateOnly) ?? 0;
        const slot = slotsForDate[Math.min(index, slotsForDate.length - 1)];
        slotUsageByDate.set(dateOnly, index + 1);
        if (index >= slotsForDate.length && !overflowWarnedForDate.has(dateOnly)) {
          overflowWarnedForDate.add(dateOnly);
          warnings.push(`日期 ${dateOnly} 的時段數（${slotsForDate.length}）少於該日匯入場次，多出的比賽已排入當日最後一時段。`);
        }
        return buildSlotResult(slot);
      };

      // Fetch existing matches for this round to update them
      const { data: existingMatches, error: fetchError } = await supabase
        .from("matches")
        .select("*")
        .eq("event_id", eventId)
        .eq("round", round);

      if (fetchError) {
        throw fetchError;
      }

      const warnings: string[] = [];
      const updates: Array<{ matchId: string; updates: any }> = [];
      const notFound: ParsedRow[] = [];

      // Create a map of existing matches by player pair (order-independent)
      const matchMap = new Map<string, any>();
      existingMatches?.forEach((match) => {
        if (match.player1_id && match.player2_id) {
          // Create a key that works regardless of player order
          const key1 = `${match.player1_id}|${match.player2_id}`;
          const key2 = `${match.player2_id}|${match.player1_id}`;
          matchMap.set(key1, match);
          matchMap.set(key2, match);
        }
      });

      for (const row of rows) {
        const playerA = playersByName.get(normalizeName(row.teamA));
        const playerB = playersByName.get(normalizeName(row.teamB));

        if (!playerA) {
          warnings.push(`第 ${row.sourceLine} 行：找不到隊伍 ${row.teamA}`);
          continue;
        }
        if (!playerB) {
          warnings.push(`第 ${row.sourceLine} 行：找不到隊伍 ${row.teamB}`);
          continue;
        }

        // Find matching existing match
        const matchKey = `${playerA.id}|${playerB.id}`;
        const existingMatch = matchMap.get(matchKey);

        if (!existingMatch) {
          notFound.push(row);
          warnings.push(`第 ${row.sourceLine} 行：找不到對應的比賽 (${row.teamA} vs ${row.teamB})`);
          continue;
        }

        const { status, winnerId } = determineStatusAndWinner(
          row.scoreA,
          row.scoreB,
          playerA.id,
          playerB.id,
        );

        // Prepare update object (only include fields that should be updated)
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        // Only update scheduled_time if date is provided in CSV
        if (row.date && row.datePrecision) {
          const matchedSlot = matchDateToSlot(row.date, row.datePrecision);
          if (matchedSlot) {
            updateData.scheduled_time = matchedSlot.scheduledTime;
            updateData.slot_id = matchedSlot.slotId;
            if (matchedSlot.court) {
              updateData.court = matchedSlot.court;
            }
          } else {
            updateData.scheduled_time = row.date;
            updateData.slot_id = null;
          }
        }

        // Update scores and status if provided
        if (row.scoreA !== undefined || row.scoreB !== undefined) {
          updateData.score1 = row.scoreA ?? null;
          updateData.score2 = row.scoreB ?? null;
          updateData.winner_id = winnerId ?? null;
          updateData.status = status;
        }

        updates.push({
          matchId: existingMatch.id,
          updates: updateData,
        });
      }

      // Perform updates
      let updatedCount = 0;
      for (const { matchId, updates: updateData } of updates) {
        const { error: updateError } = await supabase
          .from("matches")
          .update(updateData)
          .eq("id", matchId);

        if (updateError) {
          warnings.push(`更新比賽 ${matchId} 失敗: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      }

      if (notFound.length > 0 && replaceRegularSeason) {
        // If user wants to replace and there are unmatched CSV rows, ask about creating new matches
        const createNew = confirm(
          `CSV 中有 ${notFound.length} 場比賽在資料庫中找不到對應。\n\n是否要建立這些新比賽？\n\n點擊「取消」則只更新現有比賽。`
        );

        if (createNew) {
          const newMatches = notFound.map((row, idx) => {
            const playerA = playersByName.get(normalizeName(row.teamA))!;
            const playerB = playersByName.get(normalizeName(row.teamB))!;
            const { status, winnerId } = determineStatusAndWinner(
              row.scoreA,
              row.scoreB,
              playerA.id,
              playerB.id,
            );

            // Match to slot if date provided
            let scheduledTime = row.date;
            let slotId = null;
            let court = null;
            if (row.date && row.datePrecision) {
              const matchedSlot = matchDateToSlot(row.date, row.datePrecision);
              if (matchedSlot) {
                scheduledTime = matchedSlot.scheduledTime;
                slotId = matchedSlot.slotId;
                court = matchedSlot.court || null;
              }
            }

            return {
              event_id: eventId,
              round,
              match_number: (existingMatches?.length || 0) + idx + 1,
              scheduled_time: scheduledTime,
              slot_id: slotId,
              court: court,
              player1_id: playerA.id,
              player2_id: playerB.id,
              score1: row.scoreA ?? null,
              score2: row.scoreB ?? null,
              winner_id: winnerId ?? null,
              status,
            };
          });

          const { error: insertError } = await supabase
            .from("matches")
            .insert(newMatches);

          if (insertError) {
            warnings.push(`建立新比賽失敗: ${insertError.message}`);
          } else {
            updatedCount += newMatches.length;
          }
        }
      }

      const successMessage = `成功更新 ${updatedCount} 場比賽`;
      const warningMessage = warnings.length ? `，另有 ${warnings.length} 則警告` : "";

      const summaryText = [
        successMessage,
        warnings.length > 0 ? `\n警告:\n${warnings.slice(0, 20).join("\n")}` : "",
        notFound.length > 0 && !replaceRegularSeason
          ? `\n\n注意: ${notFound.length} 場比賽在資料庫中找不到對應，未進行更新。`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      setSummary(summaryText);
      toast.success(successMessage + warningMessage);

      if (warnings.length) {
        console.warn("Schedule import warnings:", warnings);
      }

      // Refresh to reflect newly inserted matches
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error: any) {
      console.error("Import schedule error", error);
      toast.error(error?.message || "匯入賽程失敗，請稍後再試");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-ntu-green mb-2">📅 匯入既定賽程</h2>
          <p className="text-sm text-gray-600 max-w-2xl">
            主辦方若已排定部分賽程，可直接匯入 CSV 檔。系統會更新 CSV 中提到的比賽日期/比分，未提及的比賽將保持 TBD 狀態。
          </p>

          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg max-w-xl">
            <ScheduleInputTimezoneField
              id="schedule-import-tz-match-csv"
              value={importTimeZone}
              onChange={handleImportTimeZoneChange}
              locale="zh"
              labelZh="第一欄日期／時間的時區"
              hintZh="依此解讀 CSV 第一欄；僅填 YYYY-MM-DD 時為該時區當日 00:00。變更時區後請重新選擇檔案以重新解析。"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm text-gray-700">
              <span className="font-semibold">匯入目標輪次</span>
              <input
                type="number"
                min={0}
                value={roundValue}
                onChange={(e) => setRoundValue(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              />
              <span className="text-xs text-gray-500">
                Season Play 建議填入 0（常規賽）。若要匯入季後賽，可指定 1、2...。
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={replaceRegularSeason}
                onChange={(e) => setReplaceRegularSeason(e.target.checked)}
              />
              允許建立 CSV 中新增的比賽（若找不到對應）
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <a
            href="/schedule-import-sample.csv"
            download="schedule-import-sample.csv"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            下載範例 CSV
          </a>
          <button
            type="button"
            onClick={handleSelectFile}
            className="bg-white border border-ntu-green text-ntu-green px-4 py-2 rounded-lg font-semibold hover:bg-ntu-green hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={importing}
          >
            {importing ? "解析中..." : "選擇 CSV 檔案"}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 space-y-2">
        <p className="font-semibold text-gray-700">格式說明</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            欄位順序：<span className="font-mono">日期, 隊伍A, 隊伍B, 比分A, 比分B</span>。範例檔可點「下載範例 CSV」取得，請將 Team A/B 等改為您賽事中的隊伍名稱。
          </li>
          <li>
            必填欄位：<span className="font-mono">隊伍A, 隊伍B</span>（日期為選填）
          </li>
          <li>
            日期欄位：第一欄可以是日期（如 <span className="font-mono">2025-01-15</span>）或留空/TBD。若留空，該比賽日期保持 TBD。
          </li>
          <li>
            <strong>同一天多場次</strong>：若只填日期，同一天多筆會<strong>依 CSV 順序</strong>對應到該日的第 1、2、3… 個時段。若第一欄寫「日期+時間」（如 <span className="font-mono">2025-01-15 14:00</span>），則會自動對應到該日<strong>最接近</strong>的可用時段。
          </li>
          <li>可選欄位：Score A, Score B，若有比分會自動標記比賽完成並計算勝隊。</li>
          <li>CSV 中的「Week X」等標題列會自動忽略，可保留原格式。</li>
          <li>系統會根據隊伍名稱匹配現有比賽並更新，未在 CSV 中提及的比賽不受影響。</li>
          <li>若找不到對應的比賽且勾選「允許建立新比賽」，系統會詢問是否建立。</li>
          <li>匯入後會自動重新整理頁面以顯示最新賽程。</li>
        </ul>
      </div>

      {summary && (
        <div className="mt-4 text-sm text-gray-600 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-4">
          {summary}
        </div>
      )}
    </div>
  );
}

