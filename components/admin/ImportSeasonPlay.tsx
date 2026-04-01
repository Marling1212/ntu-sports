"use client";

import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Player } from "@/types/database";
import {
  parseLooseDateTimeToUtcIso,
  readStoredScheduleInputTimezone,
  writeStoredScheduleInputTimezone,
  DEFAULT_SCHEDULE_INPUT_TIMEZONE,
} from "@/lib/utils/adminScheduleTimezone";
import ScheduleInputTimezoneField from "@/components/admin/ScheduleInputTimezoneField";

interface ImportSeasonPlayProps {
  eventId: string;
  players: Player[];
  defaultDivisionId?: string | null;
}

interface ParsedMatch {
  matchNumber: number;
  player1Name: string;
  player2Name: string;
  score: string;
  status: string;
  scheduledTime?: string;
  groupNumber?: number;
}

/** One row from 球員統計 sheet: which player (by name/jersey) had which stats in a match */
interface ParsedPlayerStatRow {
  matchNumber: number;
  groupNumber: number;
  side: 1 | 2;
  jersey: string;
  name: string;
  stats: Record<string, string>;
}

export default function ImportSeasonPlay({ eventId, players, defaultDivisionId }: ImportSeasonPlayProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedMatches, setParsedMatches] = useState<ParsedMatch[]>([]);
  const [parsedPlayerStats, setParsedPlayerStats] = useState<ParsedPlayerStatRow[]>([]);
  const [playerMappings, setPlayerMappings] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string>("");
  const [importTimeZone, setImportTimeZone] = useState(DEFAULT_SCHEDULE_INPUT_TIMEZONE);

  useEffect(() => {
    setImportTimeZone(readStoredScheduleInputTimezone());
  }, []);

  const handleImportTimeZoneChange = (z: string) => {
    writeStoredScheduleInputTimezone(z);
    setImportTimeZone(z);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const parseScore = (scoreStr: string): { score1: number; score2: number } | null => {
    if (!scoreStr || scoreStr === "-" || scoreStr.trim() === "") return null;
    const match = scoreStr.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (!match) return null;
    const score1 = parseInt(match[1], 10);
    const score2 = parseInt(match[2], 10);
    if (Number.isNaN(score1) || Number.isNaN(score2)) return null;
    return { score1, score2 };
  };

  const findPlayerByName = (name: string): Player | null => {
    if (!name || name.trim() === "" || name === "TBD") return null;
    const trimmedName = name.trim();
    return players.find(p => p.name === trimmedName) || null;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setFileName(file.name);
      const data = await file.arrayBuffer();
      
      let rows: string[][] = [];
      let playerStatsRows: ParsedPlayerStatRow[] = [];
      
      // Check if it's CSV or Excel - XLSX library can handle both
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      
      if (isCSV) {
        // Try different encodings for CSV
        let rowsParsed = false;
        const encodings = [
          { name: 'UTF-8', value: 'utf-8' },
          { name: 'Big5', value: 'big5' },
          { name: 'GB2312', value: 'gb2312' },
          { name: 'GBK', value: 'gbk' },
          { name: 'GB18030', value: 'gb18030' },
        ];
        
        for (const encoding of encodings) {
          try {
            const text = new TextDecoder(encoding.value, { fatal: false }).decode(data);
            // Check if we got valid text (not all question marks)
            if (text && !text.match(/^[?,\s\n\r]*$/)) {
              // Try to parse with XLSX - use raw option to prevent date conversion
              const workbook = XLSX.read(text, { 
                type: "string", 
                codepage: 65001,
                cellDates: false,  // Don't convert dates
                raw: true          // Keep raw values as strings
              });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              if (worksheet) {
                // Use raw option to prevent Excel from converting scores like "0-2" to dates
                const parsedRows = XLSX.utils.sheet_to_json<string[]>(worksheet, { 
                  header: 1, 
                  defval: "",
                  raw: true  // Keep raw string values
                });
                // Check if we got meaningful data (not all empty/question marks)
                if (parsedRows && parsedRows.length > 0 && parsedRows.some(row => row && row.length > 0 && String(row[0] || "").trim() !== "" && !String(row[0] || "").match(/^[?]+$/))) {
                  rows = parsedRows;
                  rowsParsed = true;
                  console.log(`Successfully parsed CSV with ${encoding.name} encoding`);
                  break;
                }
              }
            }
          } catch (e) {
            // Try next encoding
            continue;
          }
        }
        
        if (!rowsParsed) {
          // Fallback: try XLSX directly with raw option
          try {
            const workbook = XLSX.read(data, { 
              type: "array",
              cellDates: false,
              raw: true
            });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            if (worksheet) {
              rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { 
                header: 1, 
                defval: "",
                raw: true
              });
              rowsParsed = true;
            }
          } catch (e) {
            // Last resort
          }
        }
        
        if (!rowsParsed || rows.length === 0) {
          toast.error("無法讀取 CSV 文件，可能是編碼問題。請將 CSV 轉換為 UTF-8 編碼後再試。");
          setLoading(false);
          return;
        }
      } else {
        // Parse Excel - use raw option to prevent date conversion
        const workbook = XLSX.read(data, { 
          type: "array",
          cellDates: false,  // Don't convert dates
          raw: true         // Keep raw values as strings
        });

        // Look for "Regular Season" sheet first, then "Playoffs" if needed
        let sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes("regular") || name.toLowerCase().includes("season")
        );
        
        // If not found, try first sheet
        if (!sheetName) {
          sheetName = workbook.SheetNames[0];
        }

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          toast.error("找不到 Regular Season 工作表");
          setLoading(false);
          return;
        }

        // Parse worksheet - use raw option to prevent date conversion
        rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { 
          header: 1, 
          defval: "",
          raw: true  // Keep raw string values to prevent "0-2" from being converted to date
        });
      }
      
      // Find header row - look for row that has both "match" and "player" columns
      let headerRowIndex = -1;
      let headerRow: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.length > 0) {
          const rowLower = row.map(cell => String(cell || "").trim().toLowerCase());
          const firstCell = rowLower[0] || "";
          const hasMatch = firstCell.includes("match") || firstCell === "match #" || firstCell === "match#";
          const hasPlayer1 = rowLower.some(cell => cell.includes("player 1") || cell.includes("player1") || cell === "player 1");
          const hasPlayer2 = rowLower.some(cell => cell.includes("player 2") || cell.includes("player2") || cell === "player 2");
          
          // Only consider it a header row if it has both "match" and at least one "player" column
          if (hasMatch && (hasPlayer1 || hasPlayer2)) {
            headerRowIndex = i;
            headerRow = rowLower;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        toast.error("找不到標題列（Match #, Player 1, Player 2, Score, Status）");
        setLoading(false);
        return;
      }

      // Find column indices - be more flexible with matching
      const matchNumCol = headerRow.findIndex(h => {
        const hLower = h.toLowerCase().trim();
        return hLower.includes("match") || hLower.includes("比賽") || 
               hLower === "match #" || hLower === "match#" ||
               hLower.startsWith("match");
      });
      const player1Col = headerRow.findIndex(h => {
        const hLower = h.toLowerCase().trim();
        return hLower.includes("player 1") || hLower.includes("player1") || 
               hLower.includes("選手1") || hLower === "player 1" || 
               hLower === "player1" || hLower.startsWith("player 1") ||
               hLower.startsWith("player1");
      });
      const player2Col = headerRow.findIndex(h => {
        const hLower = h.toLowerCase().trim();
        return hLower.includes("player 2") || hLower.includes("player2") || 
               hLower.includes("選手2") || hLower === "player 2" || 
               hLower === "player2" || hLower.startsWith("player 2") ||
               hLower.startsWith("player2");
      });
      const scoreCol = headerRow.findIndex(h => {
        const hLower = h.toLowerCase().trim();
        return hLower.includes("score") || hLower.includes("比分") || 
               hLower === "score";
      });
      const statusCol = headerRow.findIndex(h => {
        const hLower = h.toLowerCase().trim();
        return hLower.includes("status") || hLower.includes("狀態") || 
               hLower === "status";
      });
      const dateCol = headerRow.findIndex(h => {
        const hLower = h.toLowerCase().trim();
        return hLower.includes("date") || hLower.includes("時間") || 
               hLower.includes("time") || hLower.includes("date & time") || 
               hLower.includes("date&time");
      });

      // Debug: log what we found
      console.log("Header row:", headerRow);
      console.log("Column indices:", { matchNumCol, player1Col, player2Col, scoreCol, statusCol, dateCol });

      if (matchNumCol === -1 || player1Col === -1 || player2Col === -1) {
        toast.error(`Excel 格式不正確，缺少必要的欄位。找到的欄位：${headerRow.join(", ")}`);
        setLoading(false);
        return;
      }

      // Check for groups
      let currentGroup: number | undefined = undefined;
      const matches: ParsedMatch[] = [];

      // Parse data rows
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const firstCell = String(row[0] || "").trim();
        
        // Check if this is a group header (e.g., "Group 1" or just "1")
        if (firstCell.toLowerCase().includes("group")) {
          const groupMatch = firstCell.match(/group\s*(\d+)/i);
          if (groupMatch) {
            currentGroup = parseInt(groupMatch[1], 10);
          }
          continue;
        }

        // Skip empty rows, header-like rows, or metadata rows
        if (!row[matchNumCol] || String(row[matchNumCol]).trim() === "") continue;
        
        // Skip rows that look like metadata (e.g., "比賽日期", "比賽地點", etc.)
        const firstCellLower = firstCell.toLowerCase();
        if (firstCellLower.includes("日期") || firstCellLower.includes("地點") || 
            firstCellLower.includes("date") || firstCellLower.includes("venue") ||
            firstCellLower.includes("組別") || firstCellLower === "") {
          continue;
        }

        const matchNumber = parseInt(String(row[matchNumCol] || ""), 10);
        if (Number.isNaN(matchNumber)) continue;

        const player1Name = String(row[player1Col] || "").trim();
        const player2Name = String(row[player2Col] || "").trim();
        const score = String(row[scoreCol] || "").trim() || "-";
        const status = String(row[statusCol] || "").trim().toLowerCase() || "upcoming";
        const dateTime = dateCol >= 0 ? String(row[dateCol] || "").trim() : undefined;
        
        // Debug: log parsed data for matches with scores
        if (score !== "-" && score.trim() !== "") {
          console.log(`解析比賽 ${matchNumber} (有比分):`, {
            player1: player1Name,
            player2: player2Name,
            score: score,
            status: status,
            dateTime: dateTime
          });
        }

        // Only add if we have at least one player name
        if (player1Name || player2Name) {
          matches.push({
            matchNumber,
            player1Name: player1Name || "TBD",
            player2Name: player2Name || "TBD",
            score,
            status: status === "completed" ? "completed" : status === "live" ? "live" : status === "delayed" ? "delayed" : "upcoming",
            scheduledTime: dateTime && dateTime !== "TBD" && dateTime !== "" ? dateTime : undefined,
            groupNumber: currentGroup,
          });
        }
      }

      // Parse 球員統計 sheet if present (player-level: which player scored, yellow card, etc.)
      if (!isCSV && typeof data !== 'string') {
        const workbook = XLSX.read(data, { type: "array", cellDates: false, raw: true });
        const psSheetName = workbook.SheetNames.find(n => n === "球員統計" || (n.toLowerCase().includes("player") && n.toLowerCase().includes("stat")));
        if (psSheetName) {
          const psSheet = workbook.Sheets[psSheetName];
          const psRows = XLSX.utils.sheet_to_json<string[]>(psSheet, { header: 1, defval: "", raw: true });
          const origHeader = (psRows[0] || []) as string[];
          const psHeader = origHeader.map(c => String(c ?? "").trim().toLowerCase());
          const matchCol = psHeader.findIndex(h => h.includes("match") || h === "match #");
          const groupCol = psHeader.findIndex(h => h.includes("group"));
          const sideCol = psHeader.findIndex(h => h.includes("side"));
          const jerseyCol = psHeader.findIndex(h => h.includes("jersey") || h === "jersey#");
          const nameCol = psHeader.findIndex(h => h === "姓名" || h.includes("name"));
          if (matchCol >= 0 && sideCol >= 0 && nameCol >= 0) {
            const statColIndices: { colIndex: number; statName: string }[] = [];
            psHeader.forEach((h, idx) => {
              if (idx === matchCol || idx === groupCol || idx === sideCol || idx === jerseyCol || idx === nameCol) return;
              const statName = String(origHeader[idx] ?? "").trim();
              if (statName !== "") statColIndices.push({ colIndex: idx, statName });
            });
            for (let i = 1; i < psRows.length; i++) {
              const r = psRows[i] || [];
              const matchNumber = parseInt(String(r[matchCol] ?? ""), 10);
              if (Number.isNaN(matchNumber)) continue;
              const groupNumber = groupCol >= 0 ? parseInt(String(r[groupCol] ?? "0"), 10) : 0;
              const sideStr = String(r[sideCol] ?? "").trim().toLowerCase();
              const side = sideStr.includes("1") || sideStr === "player1" ? 1 : 2;
              const jersey = jerseyCol >= 0 ? String(r[jerseyCol] ?? "").trim() : "";
              const name = String(r[nameCol] ?? "").trim();
              const stats: Record<string, string> = {};
              statColIndices.forEach(({ colIndex, statName }) => {
                const v = String(r[colIndex] ?? "").trim();
                if (v !== "") stats[statName] = v;
              });
              if (name || Object.keys(stats).length > 0) {
                playerStatsRows.push({ matchNumber, groupNumber: Number.isNaN(groupNumber) ? 0 : groupNumber, side, jersey, name, stats });
              }
            }
          }
        }
      }
      setParsedPlayerStats(playerStatsRows);

      if (matches.length === 0) {
        toast.error("沒有找到任何比賽數據");
        setLoading(false);
        return;
      }

      setParsedMatches(matches);

      // Auto-map players
      const mappings: Record<string, string> = {};
      const unmatched: string[] = [];

      matches.forEach(match => {
        [match.player1Name, match.player2Name].forEach(name => {
          if (name && name !== "TBD" && !mappings[name]) {
            const player = findPlayerByName(name);
            if (player) {
              mappings[name] = player.id;
            } else {
              if (!unmatched.includes(name)) {
                unmatched.push(name);
              }
            }
          }
        });
      });

      setPlayerMappings(mappings);

      if (unmatched.length > 0) {
        toast.error(`找到 ${matches.length} 場比賽，但有 ${unmatched.length} 個選手名稱無法自動匹配：${unmatched.slice(0, 5).join(", ")}${unmatched.length > 5 ? "..." : ""}`);
      } else {
        toast.success(`成功解析 ${matches.length} 場比賽！`);
      }

    } catch (error) {
      console.error("Error parsing Excel:", error);
      toast.error("解析 Excel 時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedMatches.length === 0) {
      toast.error("沒有可導入的比賽");
      return;
    }

    // Check for unmatched players
    const unmatched: string[] = [];
    parsedMatches.forEach(match => {
      [match.player1Name, match.player2Name].forEach(name => {
        if (name && name !== "TBD" && !playerMappings[name]) {
          if (!unmatched.includes(name)) {
            unmatched.push(name);
          }
        }
      });
    });

    if (unmatched.length > 0) {
      toast.error(`請先匹配所有選手：${unmatched.join(", ")}`);
      return;
    }

    // Check if there are existing matches
    const { data: existingMatchesCheck } = await supabase
      .from("matches")
      .select("id")
      .eq("event_id", eventId)
      .eq("round", 0)
      .limit(1);

    const hasExistingMatches = existingMatchesCheck && existingMatchesCheck.length > 0;
    
    let deleteExisting = false;
    if (hasExistingMatches) {
      deleteExisting = confirm(
        `檢測到現有比賽數據。\n\n` +
        `選項 1（推薦）：刪除所有現有比賽後重新導入（完全替換）\n` +
        `選項 2：取消，然後手動刪除現有比賽後再導入\n\n` +
        `點擊「確定」將刪除所有現有比賽並重新導入 ${parsedMatches.length} 場比賽。\n` +
        `點擊「取消」則取消操作。`
      );
      
      if (!deleteExisting) {
        return;
      }
    } else {
      if (!confirm(`確定要導入 ${parsedMatches.length} 場比賽嗎？`)) {
        return;
      }
    }

    setLoading(true);

    try {
      // Delete existing matches if requested
      if (deleteExisting) {
        const { error: deleteError } = await supabase
          .from("matches")
          .delete()
          .eq("event_id", eventId)
          .eq("round", 0);

        if (deleteError) {
          toast.error(`刪除現有比賽時出錯: ${deleteError.message}`);
          setLoading(false);
          return;
        }
        
        toast.success(`已刪除現有比賽，開始導入新數據...`);
      }

      // Get existing matches to update or create new ones (after potential deletion)
      const { data: existingMatches } = await supabase
        .from("matches")
        .select("id, match_number, round, group_number")
        .eq("event_id", eventId)
        .eq("round", 0);

      const existingMatchesMap = new Map<string, any>();
      existingMatches?.forEach(m => {
        const key = `${m.match_number}_${m.group_number || 0}`;
        existingMatchesMap.set(key, m);
      });

      // Fetch event_slots so we can assign slot_id when Excel time matches a slot (admin table then shows time range)
      const { data: eventSlots } = await supabase
        .from("event_slots")
        .select("id, slot_date, start_time, end_time")
        .eq("event_id", eventId)
        .order("slot_date", { ascending: true })
        .order("start_time", { ascending: true });

      const slotsByDate = new Map<string, { id: string; slot_date: string; start_time: string; end_time: string }[]>();
      eventSlots?.forEach((slot: any) => {
        const d = slot.slot_date ? String(slot.slot_date).trim().slice(0, 10) : "";
        if (!d) return;
        if (!slotsByDate.has(d)) slotsByDate.set(d, []);
        slotsByDate.get(d)!.push(slot);
      });

      const slotStartMinutes = (slot: { start_time?: string | null }): number => {
        const t = slot.start_time || "00:00";
        const [h, m] = t.split(":").map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
      };

      const taipeiDateAndMinutes = (iso: string): { dateStr: string; minutes: number } => {
        const d = new Date(iso);
        const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
        const parts = formatter.formatToParts(d);
        const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
        const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
        const minutes = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
        return { dateStr, minutes };
      };

      const usedSlotIds = new Set<string>();
      const findBestSlot = (scheduledIso: string): { id: string; slot_date: string; start_time: string; end_time: string } | null => {
        const { dateStr, minutes } = taipeiDateAndMinutes(scheduledIso);
        const slots = slotsByDate.get(dateStr);
        if (!slots?.length) return null;
        let best: (typeof slots)[0] | null = null;
        let bestDiff = Infinity;
        for (const slot of slots) {
          if (usedSlotIds.has(slot.id)) continue;
          const diff = Math.abs(slotStartMinutes(slot) - minutes);
          if (diff < bestDiff) {
            bestDiff = diff;
            best = slot;
          }
        }
        return best;
      };

      const matchesToInsert: any[] = [];
      const matchesToUpdate: any[] = [];

      for (const match of parsedMatches) {
        const player1 = playerMappings[match.player1Name] ? { id: playerMappings[match.player1Name] } : null;
        const player2 = playerMappings[match.player2Name] ? { id: playerMappings[match.player2Name] } : null;

        // Parse score
        let score1: number | null = null;
        let score2: number | null = null;
        let winnerId: string | null = null;
        
        if (match.score && match.score !== "-" && match.score.trim() !== "") {
          const scoreData = parseScore(match.score);
          if (scoreData) {
            score1 = scoreData.score1;
            score2 = scoreData.score2;
            
            // Determine winner from score if match is completed
            if (match.status === "completed") {
              if (score1 > score2 && player1) {
                winnerId = player1.id;
              } else if (score2 > score1 && player2) {
                winnerId = player2.id;
              }
            }
          } else {
            // Fallback: try simple split
            const scoreParts = match.score.split(/[-:]/).map(s => s.trim());
            if (scoreParts.length >= 2) {
              const s1 = parseInt(scoreParts[0], 10);
              const s2 = parseInt(scoreParts[1], 10);
              if (!Number.isNaN(s1) && !Number.isNaN(s2)) {
                score1 = s1;
                score2 = s2;
                if (match.status === "completed") {
                  if (score1 > score2 && player1) {
                    winnerId = player1.id;
                  } else if (score2 > score1 && player2) {
                    winnerId = player2.id;
                  }
                }
              }
            }
          }
        }
        
        // Debug: log score parsing for matches with scores or completed status
        if (match.score !== "-" || match.status === "completed") {
          console.log(`處理比賽 ${match.matchNumber} 的比分:`, {
            originalScore: match.score,
            parsedScore1: score1,
            parsedScore2: score2,
            status: match.status,
            winnerId: winnerId,
            player1: match.player1Name,
            player2: match.player2Name
          });
        }

        // Parse scheduled time as wall clock in `importTimeZone`, store UTC ISO
        let scheduledTime: string | null = null;
        if (match.scheduledTime && match.scheduledTime !== "TBD" && match.scheduledTime.trim() !== "") {
          scheduledTime = parseLooseDateTimeToUtcIso(match.scheduledTime, importTimeZone);
          if (!scheduledTime) {
            console.warn(`Could not parse date: ${match.scheduledTime}`);
          }
        }

        const matchData: any = {
          ...(defaultDivisionId ? { division_id: defaultDivisionId } : {}),
          event_id: eventId,
          round: 0,
          match_number: match.matchNumber,
          player1_id: player1?.id || null,
          player2_id: player2?.id || null,
          winner_id: winnerId,
          score1: score1,
          score2: score2,
          status: match.status,
          group_number: match.groupNumber || null,
        };

        if (scheduledTime) {
          matchData.scheduled_time = scheduledTime;
          const slot = findBestSlot(scheduledTime);
          if (slot) {
            matchData.slot_id = slot.id;
            usedSlotIds.add(slot.id);
          }
        }

        const key = `${match.matchNumber}_${match.groupNumber || 0}`;
        const existing = existingMatchesMap.get(key);

        if (existing) {
          // Update existing match
          matchesToUpdate.push({
            id: existing.id,
            ...matchData
          });
        } else {
          // Insert new match
          matchesToInsert.push(matchData);
        }
      }

      // Insert new matches
      if (matchesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("matches")
          .insert(matchesToInsert);

        if (insertError) {
          toast.error(`導入新比賽時出錯: ${insertError.message}`);
          setLoading(false);
          return;
        }
      }

      // Update existing matches
      if (matchesToUpdate.length > 0) {
        for (const match of matchesToUpdate) {
          const { id, ...updateData } = match;
          // Log the actual data being updated (especially score and time)
          console.log(`更新比賽 ${id} (Match #${match.match_number}):`, {
            score1: updateData.score1,
            score2: updateData.score2,
            scheduled_time: updateData.scheduled_time,
            status: updateData.status,
            winner_id: updateData.winner_id
          });
          
          const { error: updateError } = await supabase
            .from("matches")
            .update(updateData)
            .eq("id", id);

          if (updateError) {
            console.error(`更新比賽 ${id} 時出錯:`, updateError, updateData);
          }
        }
      }

      // Build match key -> match (id, player1_id, player2_id) for 球員統計
      const { data: allMatchesAfter } = await supabase
        .from("matches")
        .select("id, match_number, group_number, player1_id, player2_id")
        .eq("event_id", eventId)
        .eq("round", 0);
      const matchKeyToMatch = new Map<string, { id: string; player1_id: string | null; player2_id: string | null }>();
      allMatchesAfter?.forEach((m: any) => {
        matchKeyToMatch.set(`${m.match_number}_${m.group_number ?? 0}`, { id: m.id, player1_id: m.player1_id, player2_id: m.player2_id });
      });

      // Fetch team_members for all teams in these matches (to resolve 姓名/Jersey# -> team_member_id)
      const teamPlayerIds = new Set<string>();
      allMatchesAfter?.forEach((m: any) => {
        if (m.player1_id) teamPlayerIds.add(m.player1_id);
        if (m.player2_id) teamPlayerIds.add(m.player2_id);
      });
      let teamMembersList: { id: string; player_id: string; name: string; jersey_number: number | null }[] = [];
      if (teamPlayerIds.size > 0) {
        const { data: tm } = await supabase
          .from("team_members")
          .select("id, player_id, name, jersey_number")
          .in("player_id", Array.from(teamPlayerIds));
        teamMembersList = tm || [];
      }
      const teamMembersByPlayerId = new Map<string, { id: string; name: string; jersey_number: number | null }[]>();
      teamMembersList.forEach((m) => {
        if (!teamMembersByPlayerId.has(m.player_id)) teamMembersByPlayerId.set(m.player_id, []);
        teamMembersByPlayerId.get(m.player_id)!.push({ id: m.id, name: m.name, jersey_number: m.jersey_number });
      });

      // Write match_player_stats from 球員統計 sheet (player-level: which player scored, yellow card, etc.)
      let statsWritten = 0;
      for (const row of parsedPlayerStats) {
        const key = `${row.matchNumber}_${row.groupNumber}`;
        const matchInfo = matchKeyToMatch.get(key);
        if (!matchInfo) continue;
        const matchId = matchInfo.id;
        const playerId = row.side === 1 ? matchInfo.player1_id : matchInfo.player2_id;
        if (!playerId) continue;

        const members = teamMembersByPlayerId.get(playerId);
        let teamMemberId: string | null = null;
        if (members && members.length > 0) {
          const byJersey = row.jersey !== "" ? members.find(m => String(m.jersey_number ?? "") === row.jersey) : null;
          const byName = row.name !== "" ? members.find(m => m.name.trim() === row.name.trim()) : null;
          const chosen = byJersey ?? byName ?? members[0];
          teamMemberId = chosen.id;
        }

        let deleteQuery = supabase.from("match_player_stats").delete().eq("match_id", matchId).eq("player_id", playerId);
        if (teamMemberId == null) {
          deleteQuery = deleteQuery.is("team_member_id", null);
        } else {
          deleteQuery = deleteQuery.eq("team_member_id", teamMemberId);
        }
        await deleteQuery;

        const toInsert: { match_id: string; player_id: string; team_member_id: string | null; stat_name: string; stat_value: string }[] = [];
        Object.entries(row.stats).forEach(([statName, statValue]) => {
          if (statValue.trim() !== "") toInsert.push({ match_id: matchId, player_id: playerId, team_member_id: teamMemberId, stat_name: statName, stat_value: statValue.trim() });
        });
        if (toInsert.length > 0) {
          const { error: statsErr } = await supabase.from("match_player_stats").insert(toInsert);
          if (!statsErr) statsWritten += toInsert.length;
        }
      }

      const totalImported = matchesToInsert.length + matchesToUpdate.length;
      const withScore = [...matchesToInsert, ...matchesToUpdate].filter(m => m.score1 !== null || m.score2 !== null).length;
      const withTime = [...matchesToInsert, ...matchesToUpdate].filter(m => m.scheduled_time).length;
      const statsMsg = statsWritten > 0 ? `，${statsWritten} 筆統計資料` : "";
      
      toast.success(`✅ 成功導入 ${totalImported} 場比賽！\n其中 ${withScore} 場有比分，${withTime} 場有時間安排${statsMsg}`);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Error importing matches:", error);
      toast.error("導入時發生錯誤");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h2 className="text-2xl font-semibold text-ntu-green mb-4">
        📥 從 Excel 恢復賽季數據
      </h2>

      <div className="space-y-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 如何匯入：</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>到前台該賽事的<strong>賽程／籤表頁</strong>（例如 /sports/soccer/events/[賽事ID]/schedule）點「Download Excel」下載賽季 Excel。</li>
            <li>下載的檔案會包含多張工作表：<strong>Regular Season</strong>（賽程列表）、<strong>Standings</strong>（排名）、若有球員統計則還有<strong>球員統計</strong>（哪位球員進球、黃牌等）。</li>
            <li>回到本頁，點下方「選擇 Excel 或 CSV 檔案」，選剛才下載的 .xlsx 檔。</li>
            <li>系統會依 Regular Season 還原比賽（對戰、比分、狀態、時間），若有「球員統計」工作表會一併還原球員級資料。</li>
            <li>若 Excel 內的選手名稱與目前賽事選手一致會自動對應；無法對應時請在解析結果中手動選擇後再按「確認導入」。</li>
          </ol>
          <p className="text-sm text-blue-800 mt-2">
            也可上傳其他含 &quot;Regular Season&quot; 工作表的 Excel/CSV，欄位需包含 Match #、Player 1、Player 2、Score、Status、Date &amp; Time。
          </p>
        </div>

        <div>
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg max-w-xl">
            <ScheduleInputTimezoneField
              id="schedule-import-tz-season"
              value={importTimeZone}
              onChange={handleImportTimeZoneChange}
              locale="zh"
              labelZh="檔案內比賽時間的時區"
              hintZh="表內日期時間會依此時區解讀為牆上時間，再換算成單一時間點儲存；前台仍以台灣時間顯示。"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleFileButtonClick}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "解析中..." : fileName ? `已選擇: ${fileName}` : "選擇 Excel 或 CSV 檔案"}
          </button>
        </div>

        {parsedMatches.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              解析結果：{parsedMatches.length} 場比賽
            </h3>
            
            {/* Show unmatched players if any */}
            {(() => {
              const unmatched: string[] = [];
              parsedMatches.forEach(match => {
                [match.player1Name, match.player2Name].forEach(name => {
                  if (name && name !== "TBD" && !playerMappings[name]) {
                    if (!unmatched.includes(name)) {
                      unmatched.push(name);
                    }
                  }
                });
              });

              if (unmatched.length > 0) {
                return (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold text-red-600">
                      需要手動匹配的選手 ({unmatched.length} 個)：
                    </p>
                    {unmatched.map(name => (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 w-32">{name}:</span>
                        <select
                          value={playerMappings[name] || ""}
                          onChange={(e) => {
                            setPlayerMappings(prev => ({
                              ...prev,
                              [name]: e.target.value
                            }));
                          }}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">-- 選擇選手 --</option>
                          {players.map(player => (
                            <option key={player.id} value={player.id}>
                              {player.name} {player.department ? `(${player.department})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            <button
              onClick={handleImport}
              disabled={loading || (() => {
                const unmatched: string[] = [];
                parsedMatches.forEach(match => {
                  [match.player1Name, match.player2Name].forEach(name => {
                    if (name && name !== "TBD" && !playerMappings[name]) {
                      if (!unmatched.includes(name)) {
                        unmatched.push(name);
                      }
                    }
                  });
                });
                return unmatched.length > 0;
              })()}
              className="mt-4 w-full bg-ntu-green text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "導入中..." : `✅ 導入 ${parsedMatches.length} 場比賽`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

