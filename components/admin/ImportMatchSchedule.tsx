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
  date: string;
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

      const date = parseDateValue(firstCell);
      if (!date) return;

      const teamA = parts[1]?.trim() || "";
      const teamB = parts[2]?.trim() || "";

      // Require both teams to proceed
      if (!teamA || !teamB) return;

      const scoreA = parts[3]?.trim() || undefined;
      const scoreB = parts[4]?.trim() || undefined;
      const additional = parts.slice(5);

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

      const warnings: string[] = [];
      const records: any[] = [];

      let matchNumber = 1;

      for (const row of rows) {
        const playerA = playersByName.get(normalizeName(row.teamA));
        const playerB = playersByName.get(normalizeName(row.teamB));

        if (!playerA) {
          warnings.push(`第 ${row.sourceLine} 行：找不到隊伍 ${row.teamA}`);
        }
        if (!playerB) {
          warnings.push(`第 ${row.sourceLine} 行：找不到隊伍 ${row.teamB}`);
        }

        const { status, winnerId } = determineStatusAndWinner(
          row.scoreA,
          row.scoreB,
          playerA?.id,
          playerB?.id,
        );

        records.push({
          event_id: eventId,
          round,
          match_number: matchNumber,
          scheduled_time: row.date,
          player1_id: playerA?.id ?? null,
          player2_id: playerB?.id ?? null,
          score1: row.scoreA ?? null,
          score2: row.scoreB ?? null,
          winner_id: winnerId ?? null,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        matchNumber += 1;
      }

      if (replaceRegularSeason) {
        const { error: deleteError } = await supabase
          .from("matches")
          .delete()
          .eq("event_id", eventId)
          .eq("round", round);

        if (deleteError) {
          throw deleteError;
        }
      }

      const chunkSize = 100;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from("matches").insert(chunk);
        if (insertError) {
          throw insertError;
        }
      }

      const successMessage = `成功匯入 ${records.length} 場比賽`;
      const warningMessage = warnings.length ? `，另有 ${warnings.length} 則警告` : "";

      setSummary([successMessage, warnings.slice(0, 20).join("\n")].filter(Boolean).join("\n"));
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
            主辦方若已排定賽程，可直接匯入 CSV 檔。匯入資料會以指定輪次覆蓋既有賽程，不需再使用系統排程或不可出賽設定。
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
              匯入前刪除同輪次既有賽程
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
            必填欄位：<span className="font-mono">Date, Team A, Team B</span>
          </li>
          <li>可選欄位：Score A, Score B，若有比分會自動標記比賽完成並計算勝隊。</li>
          <li>CSV 中的「Week X」等標題列會自動忽略，可保留原格式。</li>
          <li>若找不到隊伍名稱，該列仍會建立比賽，但會記錄警告以供匯入後檢查。</li>
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

