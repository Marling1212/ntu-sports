"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Player } from "@/types/database";

interface ImportSeasonPlayProps {
  eventId: string;
  players: Player[];
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

export default function ImportSeasonPlay({ eventId, players }: ImportSeasonPlayProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedMatches, setParsedMatches] = useState<ParsedMatch[]>([]);
  const [playerMappings, setPlayerMappings] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string>("");

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
              // Try to parse with XLSX
              const workbook = XLSX.read(text, { type: "string", codepage: 65001 });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              if (worksheet) {
                const parsedRows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" });
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
          // Fallback: try XLSX directly
          try {
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            if (worksheet) {
              rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" });
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
        // Parse Excel
        const workbook = XLSX.read(data, { type: "array" });

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

        // Parse worksheet
        rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" });
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

        // Only add if we have at least one player name
        if (player1Name || player2Name) {
          matches.push({
            matchNumber,
            player1Name: player1Name || "TBD",
            player2Name: player2Name || "TBD",
            score,
            status: status === "completed" ? "completed" : status === "live" ? "live" : status === "delayed" ? "delayed" : "upcoming",
            scheduledTime: dateTime && dateTime !== "TBD" && dateTime !== "" ? dateTime : undefined,
            groupNumber: currentGroup
          });
        }
      }

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

    if (!confirm(`確定要導入 ${parsedMatches.length} 場比賽嗎？\n\n這將創建或更新現有的比賽數據。`)) {
      return;
    }

    setLoading(true);

    try {
      // Get existing matches to update or create new ones
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

        // Parse scheduled time - handle various formats
        let scheduledTime: string | null = null;
        if (match.scheduledTime && match.scheduledTime !== "TBD" && match.scheduledTime.trim() !== "") {
          try {
            let dateStr = match.scheduledTime.trim();
            // Handle Chinese date format: "2025/11/17 下午12:30:00"
            // Replace "下午" with PM and "上午" with AM
            dateStr = dateStr.replace(/下午/g, 'PM').replace(/上午/g, 'AM');
            // Try to parse with various formats
            let date = new Date(dateStr);
            
            // If parsing failed, try manual parsing for "YYYY/MM/DD HH:MM:SS" format
            if (isNaN(date.getTime())) {
              const matchDate = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(AM|PM)?\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/);
              if (matchDate) {
                const year = parseInt(matchDate[1], 10);
                const month = parseInt(matchDate[2], 10) - 1; // Month is 0-indexed
                const day = parseInt(matchDate[3], 10);
                let hour = parseInt(matchDate[5], 10);
                const minute = parseInt(matchDate[6], 10);
                const second = parseInt(matchDate[7], 10);
                const ampm = matchDate[4];
                
                // Handle 12-hour format
                if (ampm === 'PM' && hour < 12) {
                  hour += 12;
                } else if (ampm === 'AM' && hour === 12) {
                  hour = 0;
                }
                
                date = new Date(year, month, day, hour, minute, second);
              }
            }
            
            if (!isNaN(date.getTime())) {
              scheduledTime = date.toISOString();
            } else {
              console.warn(`Could not parse date: ${match.scheduledTime}`);
            }
          } catch (e) {
            console.error("Error parsing date:", e, match.scheduledTime);
          }
        }

        const matchData: any = {
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
          const { error: updateError } = await supabase
            .from("matches")
            .update(updateData)
            .eq("id", id);

          if (updateError) {
            console.error(`更新比賽 ${id} 時出錯:`, updateError, updateData);
          } else {
            console.log(`成功更新比賽 ${id}:`, updateData);
          }
        }
      }

      const totalImported = matchesToInsert.length + matchesToUpdate.length;
      const withScore = [...matchesToInsert, ...matchesToUpdate].filter(m => m.score1 !== null || m.score2 !== null).length;
      const withTime = [...matchesToInsert, ...matchesToUpdate].filter(m => m.scheduled_time).length;
      
      toast.success(`✅ 成功導入 ${totalImported} 場比賽！\n其中 ${withScore} 場有比分，${withTime} 場有時間安排`);
      
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
          <h3 className="font-semibold text-blue-900 mb-2">📋 使用說明：</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>上傳之前從系統導出的 Excel 或 CSV 文件（包含 &quot;Regular Season&quot; 工作表）</li>
            <li>系統會自動解析比賽數據並匹配選手</li>
            <li>如果選手名稱無法自動匹配，請手動選擇</li>
            <li>導入後會創建新比賽或更新現有比賽</li>
          </ul>
        </div>

        <div>
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

