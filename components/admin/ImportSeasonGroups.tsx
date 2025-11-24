"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Player } from "@/types/database";

interface ImportSeasonGroupsProps {
  eventId: string;
  players: Player[];
}

interface ParsedGroup {
  groupNumber: number;
  playerNames: string[];
}

export default function ImportSeasonGroups({ eventId, players }: ImportSeasonGroupsProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedGroups, setParsedGroups] = useState<ParsedGroup[]>([]);
  const [playerMappings, setPlayerMappings] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string>("");
  const [playoffTeams, setPlayoffTeams] = useState(4);

  // Download template Excel file
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Create template data
      const data: any[][] = [];
      
      // Header section
      data.push(["組別分配範本 - 請填入已抽好的組別分配"]);
      data.push([]);
      data.push(["使用說明："]);
      data.push(["1. 請在「組別」欄位填入組別編號（數字：1, 2, 3...）"]);
      data.push(["2. 在「選手姓名」欄位填入選手姓名（必須與系統中的選手姓名完全一致）"]);
      data.push(["3. 同一組的選手請放在連續的行中，組別編號相同"]);
      data.push(["4. 系級欄位為選填，不影響匯入"]);
      data.push([]);
      
      // Column headers - make sure these are clear
      data.push(["組別", "選手姓名", "系級（選填）"]);
      
      // Add example rows with clear format
      data.push([1, "範例選手A", "範例系級A"]);
      data.push([1, "範例選手B", "範例系級B"]);
      data.push([1, "範例選手C", "範例系級C"]);
      data.push([]);
      data.push([2, "範例選手D", "範例系級D"]);
      data.push([2, "範例選手E", "範例系級E"]);
      data.push([2, "範例選手F", "範例系級F"]);
      data.push([]);
      data.push(["⚠️ 請刪除以上範例資料，填入實際的組別分配"]);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // 組別
        { wch: 20 },  // 選手姓名
        { wch: 20 },  // 系級
      ];
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "組別分配");
      
      // Generate filename
      const filename = `組別分配範本.xlsx`;
      
      // Download file
      XLSX.writeFile(wb, filename);
      
      toast.success("📥 範本已下載！請填入已抽好的組別分配後再匯入。");
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("下載範本失敗，請稍後再試");
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const findPlayerByName = (name: string): Player | null => {
    if (!name || name.trim() === "") return null;
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
      
      const workbook = XLSX.read(data, { 
        type: "array",
        cellDates: false,
        raw: true
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        toast.error("找不到工作表");
        setLoading(false);
        return;
      }

      const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { 
        header: 1, 
        defval: "",
        raw: true
      });

      // Debug: log first few rows
      console.log("First 5 rows:", rows.slice(0, 5));

      // Find header row - more flexible matching
      let headerRowIndex = -1;
      let groupCol = -1;
      let playerCol = -1;

      // Try to find header row by checking for column names
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const rowLower = row.map(cell => String(cell || "").trim().toLowerCase());
        
        // Try to find group column - must be exact match or clear indicator
        const foundGroupCol = rowLower.findIndex((cell, idx) => {
          const cellStr = cell.trim();
          return (
            cellStr === "組別" || 
            cellStr === "group" ||
            cellStr.includes("組別") ||
            (cellStr.includes("group") && !cellStr.includes("player"))
          );
        });
        
        // Try to find player column - must be exact match or clear indicator
        const foundPlayerCol = rowLower.findIndex((cell, idx) => {
          const cellStr = cell.trim();
          return (
            cellStr === "選手姓名" ||
            cellStr === "選手" ||
            cellStr === "姓名" ||
            cellStr === "player name" ||
            cellStr === "player" ||
            cellStr === "name" ||
            (cellStr.includes("選手") && !cellStr.includes("組別")) ||
            (cellStr.includes("姓名") && !cellStr.includes("組別")) ||
            (cellStr.includes("player") && !cellStr.includes("group"))
          );
        });

        if (foundGroupCol !== -1 && foundPlayerCol !== -1 && foundGroupCol !== foundPlayerCol) {
          headerRowIndex = i;
          groupCol = foundGroupCol;
          playerCol = foundPlayerCol;
          console.log(`Found header at row ${i}: groupCol=${groupCol}, playerCol=${playerCol}`);
          break;
        }
      }

      // If still not found, try to detect by data pattern
      // Look for rows where first column has numbers and second column has text (names)
      if (headerRowIndex === -1) {
        console.log("Header not found by column names, trying data pattern detection...");
        for (let i = 0; i < Math.min(15, rows.length); i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;

          // Skip rows that look like headers or metadata
          const firstCell = String(row[0] || "").trim().toLowerCase();
          if (firstCell.includes("說明") || firstCell.includes("範本") || 
              firstCell.includes("組別分配") || firstCell === "") {
            continue;
          }

          // Check if this row looks like data
          const cell0 = String(row[0] || "").trim();
          const cell1 = String(row[1] || "").trim();
          
          // First column should be a number (group), second should be text (player name)
          const firstIsNumber = /^\d+$/.test(cell0);
          const secondIsText = cell1.length > 0 && !/^\d+$/.test(cell1) && cell1.length > 1;

          if (firstIsNumber && secondIsText) {
            // Check previous rows for header
            for (let j = Math.max(0, i - 3); j < i; j++) {
              const prevRow = rows[j];
              if (!prevRow) continue;
              
              const prevFirst = String(prevRow[0] || "").trim().toLowerCase();
              const prevSecond = String(prevRow[1] || "").trim().toLowerCase();
              
              // Check if previous row looks like header
              const looksLikeHeader = (
                (prevFirst.includes("組") || prevFirst.includes("group")) &&
                (prevSecond.includes("選手") || prevSecond.includes("姓名") || prevSecond.includes("player") || prevSecond.includes("name"))
              );
              
              if (looksLikeHeader) {
                headerRowIndex = j;
                groupCol = 0;
                playerCol = 1;
                console.log(`Found header by pattern at row ${j}: groupCol=${groupCol}, playerCol=${playerCol}`);
                break;
              }
            }
            
            // If no header found but data pattern is clear, assume first row is header
            if (headerRowIndex === -1 && i > 0) {
              headerRowIndex = 0;
              groupCol = 0;
              playerCol = 1;
              console.log(`Assuming first row is header: groupCol=${groupCol}, playerCol=${playerCol}`);
              break;
            }
            
            if (headerRowIndex !== -1) break;
          }
        }
      }

      if (headerRowIndex === -1 || groupCol === -1 || playerCol === -1) {
        console.error("Could not find header row. First 10 rows:", rows.slice(0, 10));
        toast.error("無法找到標題列。請確認 Excel 檔案包含「組別」和「選手姓名」欄位。");
        setLoading(false);
        return;
      }

      console.log(`Found header at row ${headerRowIndex}, groupCol: ${groupCol}, playerCol: ${playerCol}`);

      // Parse groups
      const groupsMap = new Map<number, string[]>();
      let parsedCount = 0;
      let skippedCount = 0;
      
      console.log(`Starting to parse from row ${headerRowIndex + 1}, groupCol=${groupCol}, playerCol=${playerCol}`);
      
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        // Skip rows that look like headers or metadata
        const firstCell = String(row[0] || "").trim().toLowerCase();
        if (firstCell.includes("說明") || firstCell.includes("範本") || 
            firstCell.includes("組別分配") || firstCell.includes("請刪除") ||
            firstCell === "") {
          continue;
        }

        // Get values from the identified columns
        const groupValue = String(row[groupCol] || "").trim();
        const playerName = String(row[playerCol] || "").trim();

        // Debug log for first few rows
        if (i <= headerRowIndex + 5) {
          console.log(`Row ${i + 1}: groupCol[${groupCol}]="${groupValue}", playerCol[${playerCol}]="${playerName}"`);
        }

        // Validate: group should be a number, player should be text
        if (!groupValue || !playerName) {
          skippedCount++;
          continue;
        }

        // Check if we're reading the wrong columns
        // If groupValue looks like a name (long text, not a number) and playerName looks like a number, columns are swapped
        const groupIsText = groupValue.length > 3 && !/^\d+$/.test(groupValue);
        const playerIsNumber = /^\d+$/.test(playerName);
        
        if (groupIsText && playerIsNumber) {
          console.error(`⚠️ 可能讀錯列了！Row ${i + 1}: 組別欄位讀到文字 "${groupValue}", 選手欄位讀到數字 "${playerName}"`);
          toast.error(`讀取錯誤：可能組別和選手欄位搞反了。請確認 Excel 檔案格式正確。`);
          setLoading(false);
          return;
        }

        // Parse group number - more flexible
        let groupNum: number | null = null;
        
        // Try direct number parsing first
        const directNum = parseInt(groupValue, 10);
        if (!Number.isNaN(directNum) && directNum > 0) {
          groupNum = directNum;
        } else {
          // Try to extract number from text (e.g., "組別1" -> 1)
          const groupMatch = groupValue.match(/(\d+)/);
          if (groupMatch) {
            groupNum = parseInt(groupMatch[1], 10);
          }
        }

        if (groupNum === null || Number.isNaN(groupNum) || groupNum <= 0) {
          console.warn(`Skipping row ${i + 1}: invalid group value "${groupValue}"`);
          skippedCount++;
          continue;
        }

        // Validate player name is not just a number
        if (/^\d+$/.test(playerName)) {
          console.warn(`Skipping row ${i + 1}: player name looks like a number "${playerName}"`);
          skippedCount++;
          continue;
        }

        if (!groupsMap.has(groupNum)) {
          groupsMap.set(groupNum, []);
        }
        groupsMap.get(groupNum)!.push(playerName);
        parsedCount++;
      }

      console.log(`Parsed ${parsedCount} players in ${groupsMap.size} groups, skipped ${skippedCount} rows`);

      if (groupsMap.size === 0) {
        console.error("No groups found. Parsed rows:", rows.slice(headerRowIndex, headerRowIndex + 10));
        toast.error("沒有找到任何組別分配。請確認：\n1. Excel 檔案包含「組別」和「選手姓名」欄位\n2. 組別欄位包含數字（如：1, 2, 3）\n3. 選手姓名欄位不為空");
        setLoading(false);
        return;
      }

      // Convert to array
      const groups: ParsedGroup[] = Array.from(groupsMap.entries())
        .map(([groupNumber, playerNames]) => ({
          groupNumber,
          playerNames: playerNames.filter(name => name.trim() !== "")
        }))
        .sort((a, b) => a.groupNumber - b.groupNumber);

      setParsedGroups(groups);

      // Auto-map players
      const mappings: Record<string, string> = {};
      const unmatched: string[] = [];

      groups.forEach(group => {
        group.playerNames.forEach(name => {
          if (name && !mappings[name]) {
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
        const unmatchedList = unmatched.slice(0, 10).join(", ") + (unmatched.length > 10 ? `... (共 ${unmatched.length} 個)` : "");
        toast.error(`找到 ${groups.length} 個組別，但有 ${unmatched.length} 個選手名稱無法自動匹配：${unmatchedList}\n\n請在下方手動選擇對應的選手。`);
      } else {
        const totalPlayers = groups.reduce((sum, g) => sum + g.playerNames.length, 0);
        toast.success(`✅ 成功解析 ${groups.length} 個組別，共 ${totalPlayers} 位選手！`);
      }

    } catch (error) {
      console.error("Error parsing Excel:", error);
      toast.error("解析 Excel 時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedGroups.length === 0) {
      toast.error("沒有可導入的組別");
      return;
    }

    // Check for unmatched players
    const unmatched: string[] = [];
    parsedGroups.forEach(group => {
      group.playerNames.forEach(name => {
        if (name && !playerMappings[name]) {
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
    
    if (hasExistingMatches) {
      const deleteExisting = confirm(
        `檢測到現有比賽數據。\n\n` +
        `確定要刪除所有現有比賽並根據匯入的組別重新生成比賽嗎？\n\n` +
        `此操作無法撤銷！`
      );
      
      if (!deleteExisting) {
        return;
      }
    }

    setLoading(true);

    try {
      // Delete existing matches if requested
      if (hasExistingMatches) {
        const { error: deleteError } = await supabase
          .from("matches")
          .delete()
          .eq("event_id", eventId);

        if (deleteError) {
          toast.error(`刪除現有比賽時出錯: ${deleteError.message}`);
          setLoading(false);
          return;
        }
      }

      // Generate matches for each group (round-robin)
      const matchesToInsert: any[] = [];
      let matchNumber = 1;

      parsedGroups.forEach(group => {
        const groupPlayers = group.playerNames
          .map(name => {
            const playerId = playerMappings[name];
            return playerId ? players.find(p => p.id === playerId) : null;
          })
          .filter((p): p is Player => p !== null);

        // Generate round-robin matches for this group
        for (let i = 0; i < groupPlayers.length; i++) {
          for (let j = i + 1; j < groupPlayers.length; j++) {
            matchesToInsert.push({
              event_id: eventId,
              round: 0, // Regular season
              match_number: matchNumber++,
              player1_id: groupPlayers[i].id,
              player2_id: groupPlayers[j].id,
              group_number: group.groupNumber,
              status: "upcoming"
            });
          }
        }
      });

      // Insert matches
      if (matchesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("matches")
          .insert(matchesToInsert);

        if (insertError) {
          toast.error(`導入比賽時出錯: ${insertError.message}`);
          setLoading(false);
          return;
        }
      }

      toast.success(`✅ 成功導入 ${parsedGroups.length} 個組別，生成 ${matchesToInsert.length} 場比賽！`);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Error importing groups:", error);
      toast.error("導入時發生錯誤");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-ntu-green mb-2">📤 匯入已抽好的組別</h2>
          <p className="text-sm text-gray-600 max-w-2xl mb-2">
            若您已在抽籤儀式完成組別分配，可以使用以下方式上傳：
          </p>
          <div className="text-xs text-gray-500 space-y-1 mb-3">
            <p>• <strong>方式一：</strong>下載空白範本，填入已抽好的組別分配後匯入</p>
            <p>• <strong>方式二：</strong>使用 Excel 檔案匯入組別分配（需包含「組別」和「選手姓名」欄位）</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={loading || players.length < 2}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="下載空白範本，填入已抽好的組別分配"
          >
            📥 下載空白範本
          </button>
          <button
            type="button"
            onClick={handleFileButtonClick}
            disabled={loading}
            className="bg-white border border-ntu-green text-ntu-green px-4 py-2 rounded-lg font-semibold hover:bg-ntu-green hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "解析中..." : "選擇 Excel 檔案"}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {parsedGroups.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              解析結果：{parsedGroups.length} 個組別
            </h3>
            
            {/* Show groups */}
            <div className="space-y-3 mt-4">
              {parsedGroups.map(group => (
                <div key={group.groupNumber} className="bg-white border border-gray-300 rounded-lg p-3">
                  <h4 className="font-semibold text-ntu-green mb-2">
                    組別 {group.groupNumber} ({group.playerNames.length} 位選手)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {group.playerNames.map((name, idx) => {
                      const player = players.find(p => p.id === playerMappings[name]);
                      const isMatched = !!playerMappings[name];
                      return (
                        <div
                          key={idx}
                          className={`text-sm p-2 rounded ${
                            isMatched ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                          }`}
                        >
                          {name}
                          {player && (
                            <span className="ml-1 text-xs text-gray-500">
                              ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Show unmatched players if any */}
            {(() => {
              const unmatched: string[] = [];
              parsedGroups.forEach(group => {
                group.playerNames.forEach(name => {
                  if (name && !playerMappings[name]) {
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

            {/* Calculate total matches */}
            {(() => {
              let totalMatches = 0;
              parsedGroups.forEach(group => {
                const groupSize = group.playerNames.filter(name => playerMappings[name]).length;
                totalMatches += (groupSize * (groupSize - 1)) / 2;
              });
              return (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>預估比賽數：</strong>{totalMatches} 場（每組內單循環制）
                  </p>
                </div>
              );
            })()}

            <button
              onClick={handleImport}
              disabled={loading || (() => {
                const unmatched: string[] = [];
                parsedGroups.forEach(group => {
                  group.playerNames.forEach(name => {
                    if (name && !playerMappings[name]) {
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
              {loading ? "導入中..." : `✅ 導入組別並生成比賽`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

