"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { Player } from "@/types/database";
import type { Match } from "@/types/tournament";
import { formatScheduledTimeAsStored } from "@/lib/utils/formatScheduledTime";
import {
  buildBracketGridAoAForImport,
  buildFlatPlayoffMatchesAoA,
} from "@/lib/utils/singleEliminationBracketBackupExcel";

interface ImportBracketProps {
  eventId: string;
  players: Player[];
  defaultDivisionId?: string | null;
  /** Shown in exported backup sheet header */
  eventName?: string | null;
  eventDate?: string | null;
  eventVenue?: string | null;
  /** Row「組別」欄位，例如網球男子單打 */
  divisionLabel?: string | null;
}

interface ParsedPosition {
  order: number;
  seed?: string;
  name: string;
  school?: string;
  roundResults: string[];
}

interface ParsedBracket {
  positions: ParsedPosition[];
  roundHeaders: string[];
  hasThirdPlace: boolean;
  thirdPlacePlayers?: {
    name1?: string;
    name2?: string;
  };
}

interface MatchInsertPayload {
  event_id: string;
  division_id?: string | null;
  round: number;
  match_number: number;
  player1_id?: string | null;
  player2_id?: string | null;
  winner_id?: string | null;
  status: "upcoming" | "live" | "completed" | "bye";
}

export default function ImportBracket({
  eventId,
  players,
  defaultDivisionId,
  eventName: eventNameProp,
  eventDate: eventDateProp,
  eventVenue: eventVenueProp,
  divisionLabel: divisionLabelProp,
}: ImportBracketProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [parsedBracket, setParsedBracket] = useState<ParsedBracket | null>(null);
  const [autoMappings, setAutoMappings] = useState<Record<number, string | null>>({});
  const [manualMappings, setManualMappings] = useState<Record<number, string>>({});
  const [fileName, setFileName] = useState<string>("");

  const positionsNeedingMapping = useMemo(() => {
    if (!parsedBracket) return [];
    return parsedBracket.positions.filter((pos) => {
      const isBye = !pos.name || pos.name.trim().toUpperCase() === "BYE";
      if (isBye) return false;
      const auto = autoMappings[pos.order];
      const manual = manualMappings[pos.order];
      return !(auto || manual);
    });
  }, [parsedBracket, autoMappings, manualMappings]);

  const finalMappings = useMemo(() => {
    const mapping: Record<number, string | null> = {};
    parsedBracket?.positions.forEach((pos) => {
      const manual = manualMappings[pos.order];
      if (manual) {
        mapping[pos.order] = manual;
        return;
      }
      if (autoMappings[pos.order] !== undefined) {
        mapping[pos.order] = autoMappings[pos.order];
      } else {
        mapping[pos.order] = null;
      }
    });
    return mapping;
  }, [parsedBracket, autoMappings, manualMappings]);

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      let parsed: ParsedBracket | null = null;
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;
        try {
          const candidate = parseWorksheet(worksheet);
          if (candidate.positions.length > 0) {
            parsed = candidate;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!parsed || !parsed.positions.length) {
        toast.error("找不到可解析的「籤表」工作表（需含標題列「順序」）");
        setLoading(false);
        return;
      }

      if (parsed.roundHeaders.length === 0) {
        toast.error("無法找到輪次資料，請確認檔案格式");
        setLoading(false);
        return;
      }

      const bracketSize = parsed.positions.length;
      const rounds = Math.log2(bracketSize);
      if (!Number.isInteger(rounds)) {
        toast.error(`參賽人數 (${bracketSize}) 不是 2 的冪次，無法建立單淘汰籤表`);
        setLoading(false);
        return;
      }

      const newAutoMappings: Record<number, string | null> = {};
      const normalizedPlayersMap = buildNormalizedPlayerMap(players);

      parsed.positions.forEach((pos) => {
        const isBye = !pos.name || pos.name.trim().toUpperCase() === "BYE";
        if (isBye) {
          newAutoMappings[pos.order] = null;
          return;
        }

        const matchedPlayer = normalizedPlayersMap.get(normalizeName(pos.name));
        if (matchedPlayer) {
          newAutoMappings[pos.order] = matchedPlayer.id;
        } else {
          newAutoMappings[pos.order] = null;
        }
      });

      setParsedBracket(parsed);
      setAutoMappings(newAutoMappings);
      setManualMappings({});
      setFileName(file.name);
      toast.success("✅ 解析成功！請確認預覽後執行匯入。");
    } catch (error) {
      console.error("Import parse error:", error);
      toast.error("匯入失敗：無法讀取檔案或格式不符");
    } finally {
      setLoading(false);
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleManualMappingChange = (order: number, playerId: string) => {
    setManualMappings((prev) => ({
      ...prev,
      [order]: playerId,
    }));
  };

  const playerOptions = useMemo(() => {
    return players.map((player) => ({
      value: player.id,
      label: `${player.name}${player.seed ? ` (Seed ${player.seed})` : ""}${player.department ? ` · ${player.department}` : ""}`,
    }));
  }, [players]);

  const handleConfirmImport = async () => {
    if (!parsedBracket) {
      toast.error("請先上傳 Excel 檔案");
      return;
    }

    const unresolved = parsedBracket.positions.filter((pos) => {
      const isBye = !pos.name || pos.name.trim().toUpperCase() === "BYE";
      if (isBye) return false;
      const mappedId = finalMappings[pos.order];
      return !mappedId;
    });

    if (unresolved.length > 0) {
      toast.error("仍有選手尚未對應至系統中的選手，請先完成手動對應。");
      return;
    }

    try {
      setLoading(true);

      const payload = buildMatchesPayload({
        eventId,
        players,
        parsedBracket,
        mapping: finalMappings,
        defaultDivisionId,
      });

      if (!payload.matches.length) {
        toast.error("沒有可匯入的比賽資料");
        setLoading(false);
        return;
      }

      // Delete existing playoff matches for this scope (division when set, else whole event)
      let deleteQuery = supabase.from("matches").delete().eq("event_id", eventId);
      if (defaultDivisionId) {
        deleteQuery = deleteQuery.eq("division_id", defaultDivisionId);
      }
      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        throw deleteError;
      }

      // Insert new matches
      const { error: insertError } = await supabase
        .from("matches")
        .insert(payload.matches);

      if (insertError) {
        throw insertError;
      }

      // Update 3rd place setting if applicable
      if (payload.hasThirdPlace !== undefined) {
        await supabase
          .from("events")
          .update({ has_third_place_match: payload.hasThirdPlace })
          .eq("id", eventId);
      }

      toast.success("🎉 籤表匯入成功！");
      // Refresh page to show new matches in downstream components
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(`匯入失敗：${error?.message || "請稍後再試"}`);
      setLoading(false);
    }
  };

  /** Admin backup: same「籤表」sheet shape as import parser + flat「賽程與比分」for对照 */
  const handleDownloadBracketBackup = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("matches")
        .select(
          `
          id,
          round,
          match_number,
          status,
          score1,
          score2,
          scheduled_time,
          player1:players!matches_player1_id_fkey(id, name, seed, department),
          player2:players!matches_player2_id_fkey(id, name, seed, department),
          winner:players!matches_winner_id_fkey(id, name, seed, department)
        `
        )
        .eq("event_id", eventId)
        .gte("round", 1)
        .order("round", { ascending: true })
        .order("match_number", { ascending: true });
      if (defaultDivisionId) {
        query = query.eq("division_id", defaultDivisionId);
      }
      const { data: rows, error } = await query;
      if (error) throw error;
      if (!rows?.length) {
        toast.error("尚無單淘汰比賽可下載（請先產生籤表）");
        return;
      }

      const matches: Match[] = (rows as any[]).map((m) => ({
        id: m.id,
        round: m.round,
        matchNumber: m.match_number,
        status: m.status,
        score:
          m.score1 != null && m.score2 != null ? `${m.score1}-${m.score2}` : undefined,
        player1: m.player1?.id
          ? {
              id: m.player1.id,
              name: m.player1.name,
              seed: m.player1.seed ?? undefined,
              school: m.player1.department ?? undefined,
            }
          : null,
        player2: m.player2?.id
          ? {
              id: m.player2.id,
              name: m.player2.name,
              seed: m.player2.seed ?? undefined,
              school: m.player2.department ?? undefined,
            }
          : null,
        winner: m.winner?.id
          ? {
              id: m.winner.id,
              name: m.winner.name,
              seed: m.winner.seed ?? undefined,
              school: m.winner.department ?? undefined,
            }
          : null,
      }));

      const scheduledByMatchId: Record<string, string> = {};
      for (const m of rows as any[]) {
        if (m.scheduled_time) {
          const s = formatScheduledTimeAsStored(m.scheduled_time);
          scheduledByMatchId[m.id] = s === "—" ? "" : s;
        }
      }

      const maxRound = Math.max(...matches.map((m) => m.round), 1);
      const gridAoA = buildBracketGridAoAForImport({
        eventName: eventNameProp || "賽事",
        eventDate: eventDateProp || "",
        eventVenue: eventVenueProp || "",
        divisionLabel: divisionLabelProp || "單淘汰",
        matches,
      });

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet(gridAoA);
      const colWidths1 = [{ wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 20 }];
      for (let i = 0; i < maxRound; i++) colWidths1.push({ wch: 20 });
      ws1["!cols"] = colWidths1;
      XLSX.utils.book_append_sheet(wb, ws1, "籤表");

      const flatAoA = buildFlatPlayoffMatchesAoA(matches, scheduledByMatchId);
      const ws2 = XLSX.utils.aoa_to_sheet(flatAoA);
      ws2["!cols"] = [
        { wch: 38 },
        { wch: 6 },
        { wch: 8 },
        { wch: 18 },
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "賽程與比分");

      const ts = new Date().toISOString().slice(0, 10);
      const safe = (eventNameProp || "bracket").replace(/\s+/g, "_");
      XLSX.writeFile(wb, `${safe}_籤表備份_${ts}.xlsx`);
      toast.success("📥 已下載籤表與賽程備份（含比分對照）");
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "下載失敗");
    } finally {
      setLoading(false);
    }
  };

  // Download template Excel file
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Calculate bracket size (next power of 2)
      const bracketSize = players.length >= 2 
        ? Math.pow(2, Math.ceil(Math.log2(players.length))) 
        : 16; // Default to 16 if no players
      const numRounds = Math.log2(bracketSize);
      
      // Create template data
      const data: any[][] = [];
      
      // Header section
      data.push(["籤表範本 - 請填入已抽好的選手分配"]);
      data.push([]);
      data.push(["說明：請在「姓名」欄位填入選手姓名，在「系級」欄位填入系級（選填），「種子」欄位填入種子號碼（選填，格式：s1, s2...）"]);
      data.push(["空的位置請填入「BYE」或留空"]);
      data.push([]);
      
      // Column headers
      const headers = ["順序", "種子", "姓名", "系級"];
      for (let i = 1; i <= numRounds; i++) {
        if (i === 1) headers.push("第一輪");
        else if (i === 2) headers.push("第二輪");
        else if (i === 3) headers.push("第三輪");
        else if (i === 4) headers.push("第四輪");
        else if (i === 5) headers.push("第五輪");
        else if (i === 6) headers.push("第六輪");
        else if (i === 7) headers.push("第七輪");
      }
      data.push(headers);
      
      // Add empty rows for positions
      for (let i = 1; i <= bracketSize; i++) {
        const row: any[] = [i, "", "", ""];
        for (let j = 0; j < numRounds; j++) {
          row.push("");
        }
        data.push(row);
      }
      
      // Add 3rd place match section
      data.push([]);
      data.push(["季軍賽 (3rd Place Match)"]);
      data.push(["", "", "選手1", ""]);
      data.push(["", "", "選手2", ""]);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Set column widths
      const colWidths = [
        { wch: 8 },  // 順序
        { wch: 8 },  // 種子
        { wch: 15 }, // 姓名
        { wch: 20 }, // 系級
      ];
      for (let i = 0; i < numRounds; i++) {
        colWidths.push({ wch: 18 });
      }
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "籤表");
      
      // Generate filename
      const filename = `籤表範本_${bracketSize}人.xlsx`;
      
      // Download file
      XLSX.writeFile(wb, filename);
      
      toast.success("📥 範本已下載！請填入已抽好的選手分配後再匯入。");
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("下載範本失敗，請稍後再試");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-ntu-green mb-2">📥 籤表備份與匯入</h2>
          <p className="text-sm text-gray-600 max-w-2xl mb-2">
            在此<strong>下載</strong>與<strong>上傳</strong>同一套 Excel 流程：先下載目前籤表（含各輪結果與賽程明細）做備份，修改後再用下方「選擇檔案 → 匯入籤表」覆寫系統內的比賽結構。
          </p>
          <div className="text-xs text-gray-500 space-y-1 mb-3">
            <p>• <strong>下載目前資料：</strong>產生「籤表」+「賽程與比分」兩個工作表；格式與匯入解析相容。</p>
            <p>• <strong>下載空白範本：</strong>僅有籤位，適合從零填寫後匯入。</p>
            <p>• <strong>手動編輯：</strong>也可使用「手動分配籤表」在網頁上調整。</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadBracketBackup}
            disabled={loading}
            className="bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="下載與匯入相同欄位結構的籤表，並附賽程明細"
          >
            {loading ? "處理中…" : "📥 下載目前籤表與比分"}
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={loading || players.length < 2}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title="下載空白範本，填入已抽好的選手分配"
          >
            下載空白範本
          </button>
          <button
            type="button"
            onClick={handleFileButtonClick}
            disabled={loading}
            className="bg-white border border-ntu-green text-ntu-green px-4 py-2 rounded-lg font-semibold hover:bg-ntu-green hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "解析中..." : "選擇 Excel 檔案"}
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={loading || !parsedBracket || positionsNeedingMapping.length > 0}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "匯入中..." : "匯入籤表"}
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

      {parsedBracket && (
        <div className="mt-6 space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700">
              匯入預覽：{fileName || "無檔名"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm text-gray-600">
              <div>
                <p>參賽人數：{parsedBracket.positions.length} 人</p>
                <p>總輪數：{parsedBracket.roundHeaders.length} 輪</p>
              </div>
              <div>
                <p>是否包含季軍賽：{parsedBracket.hasThirdPlace ? "是" : "否"}</p>
                <p>尚未對應的選手數：{positionsNeedingMapping.length}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * 匯入會刪除並重建<strong>本項目／本賽事</strong>的季後賽比賽列（依是否選擇組別而定）。請先確認 Matches 頁面不需保留既有比分與排程。
            </p>
          </div>

          {positionsNeedingMapping.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-3">⚠️ 尚未對應的選手</h4>
              <p className="text-sm text-yellow-800 mb-3">
                下列選手在系統中找不到同名紀錄，請手動選擇對應的選手。若尚未建立，請先至 Players 標籤新增選手後再匯入。
              </p>
              <div className="space-y-4">
                {positionsNeedingMapping.map((pos) => (
                  <div key={pos.order} className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="md:w-1/3">
                      <p className="font-semibold text-gray-700">
                        #{pos.order} {pos.name}
                      </p>
                      {pos.school && (
                        <p className="text-xs text-gray-500">{pos.school}</p>
                      )}
                    </div>
                    <select
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                      value={manualMappings[pos.order] || ""}
                      onChange={(e) => handleManualMappingChange(pos.order, e.target.value)}
                    >
                      <option value="">請選擇對應選手</option>
                      {playerOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-ntu-green text-white">
                <tr>
                  <th className="px-3 py-2 text-left">順序</th>
                  <th className="px-3 py-2 text-left">姓名</th>
                  <th className="px-3 py-2 text-left">系級</th>
                  <th className="px-3 py-2 text-left">自動對應</th>
                  <th className="px-3 py-2 text-left">手動對應</th>
                </tr>
              </thead>
              <tbody>
                {parsedBracket.positions.map((pos, index) => {
                  const isBye = !pos.name || pos.name.trim().toUpperCase() === "BYE";
                  const autoLabel = players.find((player) => player.id === autoMappings[pos.order]);
                  const manualLabel = players.find((player) => player.id === manualMappings[pos.order]);

                  return (
                    <tr key={pos.order} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 font-semibold text-gray-700">#{pos.order}</td>
                      <td className="px-3 py-2 text-gray-700">{pos.name || "BYE"}</td>
                      <td className="px-3 py-2 text-gray-500">{pos.school || ""}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {isBye ? "(BYE)" : autoLabel ? autoLabel.name : "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {manualLabel ? manualLabel.name : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>
              ⚠️ 匯入時<strong>只讀取「籤表」工作表</strong>的抽籤位置與 BYE；各輪結果欄位僅供人眼對照，<strong>不會</strong>自動寫回比分。
            </p>
            <p>
              「賽程與比分」工作表在下載檔案中一併提供，方便備份與對帳；還原比分請至 Matches 頁面編輯（日後若要支援從檔還原可再擴充）。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function parseWorksheet(worksheet: XLSX.WorkSheet): ParsedBracket {
  const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    raw: false,
  });

  const headerIndex = rows.findIndex((row) => Array.isArray(row) && row[0] === "順序");
  if (headerIndex === -1) {
    throw new Error("未找到標題列。請使用系統匯出的 Excel 範本。");
  }

  const headerRow = rows[headerIndex];
  const roundHeaders = headerRow.slice(4).filter((cell) => Boolean(cell)) as string[];

  const positions: ParsedPosition[] = [];
  let cursor = headerIndex + 1;

  while (cursor < rows.length) {
    const row = rows[cursor];
    cursor += 1;

    if (!row || row.length === 0) {
      break;
    }

    const orderRaw = row[0];
    const order = Number(orderRaw);
    if (!order || Number.isNaN(order)) {
      // Reached section break or invalid row
      break;
    }

    const seed = row[1] ? String(row[1]).trim() : undefined;
    const name = row[2] ? String(row[2]).trim() : "";
    const school = row[3] ? String(row[3]).trim() : "";
    const roundResults = row.slice(4, 4 + roundHeaders.length).map((cell) => (cell ? String(cell).trim() : ""));

    positions.push({
      order,
      seed,
      name,
      school,
      roundResults,
    });
  }

  let hasThirdPlace = false;
  let thirdPlacePlayers: { name1?: string; name2?: string } | undefined;

  while (cursor < rows.length) {
    const row = rows[cursor];
    if (!row) {
      cursor += 1;
      continue;
    }

    const text = row[0] ? String(row[0]).trim() : "";
    if (text.includes("季軍賽")) {
      const row1 = rows[cursor + 1] || [];
      const row2 = rows[cursor + 2] || [];
      const name1 = row1[2] ? String(row1[2]).trim() : undefined;
      const name2 = row2[2] ? String(row2[2]).trim() : undefined;

      if (name1 || name2) {
        hasThirdPlace = true;
        thirdPlacePlayers = { name1, name2 };
      }
      break;
    }

    cursor += 1;
  }

  positions.sort((a, b) => a.order - b.order);

  return {
    positions,
    roundHeaders,
    hasThirdPlace,
    thirdPlacePlayers,
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function buildNormalizedPlayerMap(players: Player[]): Map<string, Player> {
  const map = new Map<string, Player>();
  players.forEach((player) => {
    map.set(normalizeName(player.name), player);
  });
  return map;
}

function buildMatchesPayload({
  eventId,
  players,
  parsedBracket,
  mapping,
  defaultDivisionId,
}: {
  eventId: string;
  players: Player[];
  parsedBracket: ParsedBracket;
  mapping: Record<number, string | null>;
  defaultDivisionId?: string | null;
}): { matches: MatchInsertPayload[]; hasThirdPlace?: boolean } {
  const positions = parsedBracket.positions;
  const bracketSize = positions.length;
  const totalRounds = Math.log2(bracketSize);
  const divisionPayload = defaultDivisionId ? { division_id: defaultDivisionId } : {};

  const getPlayerIdByOrder = (order: number): string | null => {
    const mapped = mapping[order];
    return mapped || null;
  };

  const round2Advances: Map<string, string> = new Map();
  const matches: MatchInsertPayload[] = [];
  let matchesInRound = bracketSize / 2;

  for (let round = 1; round <= totalRounds; round++) {
    for (let i = 0; i < matchesInRound; i++) {
      const matchNumber = i + 1;

      if (round === 1) {
        const positionIndex = i * 2;
        const pos1 = positions[positionIndex];
        const pos2 = positions[positionIndex + 1];

        const player1Id = pos1 ? getPlayerIdByOrder(pos1.order) : null;
        const player2Id = pos2 ? getPlayerIdByOrder(pos2.order) : null;

        const nextRoundMatch = Math.ceil(matchNumber / 2);
        const feedsPlayer1 = matchNumber % 2 === 1;
        const slotKey = `${nextRoundMatch}-${feedsPlayer1 ? "1" : "2"}`;

        if (player1Id && !player2Id) {
          round2Advances.set(slotKey, player1Id);
          matches.push({
            ...divisionPayload,
            event_id: eventId,
            round,
            match_number: matchNumber,
            player1_id: player1Id,
            player2_id: null,
            winner_id: player1Id,
            status: "bye",
          });
        } else if (!player1Id && player2Id) {
          round2Advances.set(slotKey, player2Id);
          matches.push({
            ...divisionPayload,
            event_id: eventId,
            round,
            match_number: matchNumber,
            player1_id: null,
            player2_id: player2Id,
            winner_id: player2Id,
            status: "bye",
          });
        } else if (!player1Id && !player2Id) {
          matches.push({
            ...divisionPayload,
            event_id: eventId,
            round,
            match_number: matchNumber,
            player1_id: null,
            player2_id: null,
            status: "bye",
          });
        } else {
          matches.push({
            ...divisionPayload,
            event_id: eventId,
            round,
            match_number: matchNumber,
            player1_id: player1Id,
            player2_id: player2Id,
            status: "upcoming",
          });
        }
      } else if (round === 2) {
        const player1Key = `${matchNumber}-1`;
        const player2Key = `${matchNumber}-2`;
        const player1Id = round2Advances.get(player1Key) || null;
        const player2Id = round2Advances.get(player2Key) || null;

        matches.push({
          ...divisionPayload,
          event_id: eventId,
          round,
          match_number: matchNumber,
          player1_id: player1Id,
          player2_id: player2Id,
          status: "upcoming",
        });
      } else {
        matches.push({
          ...divisionPayload,
          event_id: eventId,
          round,
          match_number: matchNumber,
          status: "upcoming",
        });
      }
    }
    matchesInRound = matchesInRound / 2;
  }

  // 3rd place match (if present and tournament has at least semifinals)
  if (parsedBracket.hasThirdPlace && totalRounds >= 2) {
    const thirdPlacePlayers = parsedBracket.thirdPlacePlayers || {};
    const thirdPlaceMatch: MatchInsertPayload = {
      ...divisionPayload,
      event_id: eventId,
      round: totalRounds,
      match_number: 2,
      status: "upcoming",
    };

    if (thirdPlacePlayers.name1) {
      const normalized = normalizeName(thirdPlacePlayers.name1);
      const player = players.find((p) => normalizeName(p.name) === normalized);
      if (player) thirdPlaceMatch.player1_id = player.id;
    }

    if (thirdPlacePlayers.name2) {
      const normalized = normalizeName(thirdPlacePlayers.name2);
      const player = players.find((p) => normalizeName(p.name) === normalized);
      if (player) thirdPlaceMatch.player2_id = player.id;
    }

    matches.push(thirdPlaceMatch);
    return { matches, hasThirdPlace: true };
  }

  return { matches, hasThirdPlace: false };
}
