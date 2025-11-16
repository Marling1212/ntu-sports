"use client";

import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Player } from "@/types/database";

interface ImportMatchScheduleProps {
  eventId: string;
  players: Player[];
}

interface ParsedRow {
  date: string | null; // null means TBD or not specified
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

const parseDateValue = (value: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Ignore header rows like "Week 1"
  if (/^week/i.test(trimmed)) {
    return null;
  }

  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyRegex.test(trimmed)) {
    return `${trimmed}T00:00:00+08:00`;
  }

  // Try to parse generic datetime string
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
};

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

  const parseCsv = (text: string): ParsedRow[] => {
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

      // Try to parse date, but allow empty/TBD values
      const date = parseDateValue(firstCell);
      // If first cell is not a date, treat it as teamA (date column is optional)
      let teamA: string;
      let teamB: string;
      
      if (date) {
        // Format: Date, TeamA, TeamB, ...
        teamA = parts[1]?.trim() || "";
        teamB = parts[2]?.trim() || "";
      } else {
        // Format: TeamA, TeamB, ... (no date column)
        teamA = firstCell;
        teamB = parts[1]?.trim() || "";
      }

      // Require both teams to proceed
      if (!teamA || !teamB) return;

      // Adjust score column indices based on whether date was present
      const scoreIndex = date ? 3 : 2;
      const scoreA = parts[scoreIndex]?.trim() || undefined;
      const scoreB = parts[scoreIndex + 1]?.trim() || undefined;
      const additional = parts.slice(scoreIndex + 2);

      parsedRows.push({
        date,
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
      const rows = parseCsv(text);

      if (rows.length === 0) {
        toast.error("檔案內沒有可匯入的賽程資料");
        return;
      }

      const round = Number(roundValue);
      if (Number.isNaN(round) || round < 0) {
        toast.error("請輸入有效的輪次數值 (0 或以上)");
        return;
      }

      // Fetch existing time slots for this event to match dates
      const { data: slots, error: slotsError } = await supabase
        .from("event_slots")
        .select("*")
        .eq("event_id", eventId)
        .order("slot_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (slotsError) {
        console.warn("Could not fetch slots:", slotsError);
      }

      // Create a map of slots by date (YYYY-MM-DD format)
      const slotsByDate = new Map<string, any[]>();
      slots?.forEach((slot) => {
        const dateStr = slot.slot_date; // Already in YYYY-MM-DD format
        if (!slotsByDate.has(dateStr)) {
          slotsByDate.set(dateStr, []);
        }
        slotsByDate.get(dateStr)!.push(slot);
      });

      // Helper function to match date to a slot
      const matchDateToSlot = (dateStr: string): { scheduledTime: string; slotId: string } | null => {
        // Extract date part (YYYY-MM-DD) from ISO string if needed
        const dateOnly = dateStr.split("T")[0];
        const slotsForDate = slotsByDate.get(dateOnly);
        
        if (slotsForDate && slotsForDate.length > 0) {
          // Use the first available slot for that date
          const slot = slotsForDate[0];
          // Combine date and time: slot_date is YYYY-MM-DD, start_time is HH:MM:SS
          return {
            scheduledTime: `${slot.slot_date}T${slot.start_time}+08:00`,
            slotId: slot.id,
          };
        }
        
        // No slot found, return null (will use midnight as fallback)
        return null;
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
        if (row.date) {
          // Try to match to an existing slot first
          const matchedSlot = matchDateToSlot(row.date);
          if (matchedSlot) {
            updateData.scheduled_time = matchedSlot.scheduledTime;
            updateData.slot_id = matchedSlot.slotId;
          } else {
            // No slot found, use the date as-is (will default to midnight)
            updateData.scheduled_time = row.date;
            // Clear slot_id if no slot matched
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
            if (row.date) {
              const matchedSlot = matchDateToSlot(row.date);
              if (matchedSlot) {
                scheduledTime = matchedSlot.scheduledTime;
                slotId = matchedSlot.slotId;
              }
            }

            return {
              event_id: eventId,
              round,
              match_number: (existingMatches?.length || 0) + idx + 1,
              scheduled_time: scheduledTime,
              slot_id: slotId,
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
            必填欄位：<span className="font-mono">Team A, Team B</span>（日期為選填）
          </li>
          <li>
            日期欄位：第一欄可以是日期（如 <span className="font-mono">2025-01-15</span>）或留空/TBD。若留空，該比賽日期保持 TBD。
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

