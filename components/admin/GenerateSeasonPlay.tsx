"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Player } from "@/types/database";

/** Standard bracket seed order: 1v8, 4v5, 2v7, 3v6 for size 8. */
function getBracketSeedOrder(size: number): number[] {
  if (size === 2) return [0, 1];
  if (size === 4) return [0, 3, 1, 2];
  if (size === 8) return [0, 7, 3, 4, 1, 6, 2, 5];
  if (size === 16) return [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
  const out: number[] = [];
  for (let i = 0; i < size; i++) out.push(i);
  return out;
}

interface GenerateSeasonPlayProps {
  eventId: string;
  players: Player[];
  /** Initial playoff qualifiers per group from event (for display & when generating playoffs) */
  initialQualifiersPerGroup?: number;
}

export default function GenerateSeasonPlay({ eventId, players, initialQualifiersPerGroup }: GenerateSeasonPlayProps) {
  const [loading, setLoading] = useState(false);
  const [numGroups, setNumGroups] = useState(1); // Default: 1 group (single round-robin)
  const [playoffTeams, setPlayoffTeams] = useState(initialQualifiersPerGroup ?? 4);
  const supabase = createClient();

  useEffect(() => {
    if (initialQualifiersPerGroup != null && initialQualifiersPerGroup >= 1) {
      setPlayoffTeams(Math.min(64, Math.max(1, initialQualifiersPerGroup)));
    }
  }, [initialQualifiersPerGroup]);

  // Helper function to shuffle array randomly
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const generateSeasonMatches = async () => {
    if (players.length < 3) {
      toast.error(`Season play requires at least 3 players. Currently have ${players.length} players.`);
      return;
    }

    if (numGroups < 1 || numGroups > players.length) {
      toast.error(`Number of groups must be between 1 and ${players.length}`);
      return;
    }

    if (playoffTeams >= players.length) {
      toast.error(`Playoff teams (${playoffTeams}) must be less than total players (${players.length})`);
      return;
    }

    // Calculate matches per group
    const playersPerGroup = Math.floor(players.length / numGroups);
    const remainder = players.length % numGroups;
    let totalMatches = 0;
    
    for (let g = 0; g < numGroups; g++) {
      const groupSize = playersPerGroup + (g < remainder ? 1 : 0);
      totalMatches += (groupSize * (groupSize - 1)) / 2;
    }

    // Check if there are existing completed matches
    const { data: existingMatches, error: checkError } = await supabase
      .from("matches")
      .select("id, status")
      .eq("event_id", eventId);

    if (!checkError && existingMatches && existingMatches.length > 0) {
      const completedCount = existingMatches.filter(m => m.status === 'completed').length;
      if (completedCount > 0) {
        const warningText = `⚠️ 警告：檢測到 ${existingMatches.length} 場現有比賽，其中 ${completedCount} 場已完成！\n\n重置將刪除所有現有比賽數據，包括：\n- 所有比賽記錄\n- 所有比賽統計數據\n- 所有比分和結果\n\n此操作無法撤銷！\n\n確定要繼續重置並生成新的賽程嗎？\n\n（如果點擊確定，系統會自動備份現有數據以便恢復）`;
        
        if (!confirm(warningText)) return;
        
        // Second confirmation for safety
        if (!confirm(`最後確認：您真的要刪除 ${completedCount} 場已完成的比賽嗎？\n\n請再次確認！`)) return;
      } else {
        const confirmText = `確定要生成季賽賽程嗎？\n\n選手數: ${players.length}\n分組數: ${numGroups}\n\n常規賽:\n- 隨機分組後，每組內採用單循環制\n- 總比賽數: ${totalMatches} 場\n\n季後賽:\n- 前 ${playoffTeams} 名進入季後賽\n- 採用單淘汰制\n\n⚠️ 注意：這將刪除所有現有比賽（${existingMatches.length} 場）\n\n確定生成？`;
        
        if (!confirm(confirmText)) return;
      }
    } else {
      const confirmText = `確定要生成季賽賽程嗎？\n\n選手數: ${players.length}\n分組數: ${numGroups}\n\n常規賽:\n- 隨機分組後，每組內採用單循環制\n- 總比賽數: ${totalMatches} 場\n\n季後賽:\n- 前 ${playoffTeams} 名進入季後賽\n- 採用單淘汰制\n\n確定生成？`;
      
      if (!confirm(confirmText)) return;
    }

    setLoading(true);

    try {
      // Backup existing matches before deletion
      const { data: existingMatches, error: fetchError } = await supabase
        .from("matches")
        .select("*")
        .eq("event_id", eventId);

      if (fetchError) {
        toast.error(`Error fetching existing matches: ${fetchError.message}`);
        setLoading(false);
        return;
      }

      // Store backup in events table
      if (existingMatches && existingMatches.length > 0) {
        const backupData = {
          matches: existingMatches,
          backup_time: new Date().toISOString(),
        };
        
        const { error: backupError } = await supabase
          .from("events")
          .update({ 
            playoff_qualifiers_per_group: playoffTeams,
            matches_backup: backupData 
          })
          .eq("id", eventId);

        if (backupError) {
          console.error("Failed to backup matches:", backupError);
          // Continue anyway, but warn user
          toast.error("警告：無法備份現有比賽數據，但將繼續重置");
        } else {
          toast.success(`已備份 ${existingMatches.length} 場比賽數據`);
        }
      }

      // Persist chosen playoff qualifiers per group on the event
      await supabase.from("events").update({ playoff_qualifiers_per_group: playoffTeams }).eq("id", eventId);

      // Delete existing matches
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("event_id", eventId);

      if (deleteError) {
        toast.error(`Error deleting existing matches: ${deleteError.message}`);
        setLoading(false);
        return;
      }

      // Randomly shuffle players
      const shuffledPlayers = shuffleArray(players);

      // Divide players into groups
      const groups: Player[][] = [];
      let playerIndex = 0;
      
      for (let g = 0; g < numGroups; g++) {
        const groupSize = playersPerGroup + (g < remainder ? 1 : 0);
        groups.push(shuffledPlayers.slice(playerIndex, playerIndex + groupSize));
        playerIndex += groupSize;
      }

      // Generate round-robin matches within each group (Round 0)
      const regularSeasonMatches = [];
      let globalMatchNumber = 1;

      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex];

        // Round-robin within this group
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            regularSeasonMatches.push({
              event_id: eventId,
              round: 0, // Round 0 = Regular Season
              match_number: globalMatchNumber++,
              group_number: groupIndex + 1, // Group numbers start from 1
              player1_id: group[i].id,
              player2_id: group[j].id,
              status: "upcoming",
              // No scheduled_time - all matches start as TBD
            });
          }
        }
      }

      // Insert regular season matches
      const { error: matchError } = await supabase
        .from("matches")
        .insert(regularSeasonMatches);

      if (matchError) {
        toast.error(`Error creating matches: ${matchError.message}`);
        setLoading(false);
        return;
      }

      // Show group assignment in success message
      const groupInfo = groups.map((g, idx) => 
        `Group ${idx + 1}: ${g.map(p => p.name).join(', ')}`
      ).join('\n');

      toast.success(`✅ 已生成 ${regularSeasonMatches.length} 場常規賽！\n\n分組結果:\n${groupInfo}\n\n⚠️ 所有比賽日期為 TBD，請手動排程或匯入 CSV\n⚠️ 常規賽結束後，請手動點擊「生成季後賽」按鈕`);
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      console.error("Error:", err);
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  };

  /** Create playoff bracket with SEED SLOTS only (no team names yet). Admin can edit draw; names fill in from standings. */
  const createPlayoffBracketTemplate = async () => {
    const totalTeams = numGroups * playoffTeams;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
    const numRounds = Math.log2(bracketSize);

    if (totalTeams < 2) {
      toast.error("Need at least 2 teams for playoffs (groups × qualifiers).");
      return;
    }

    const confirmMsg = `建立季後賽籤表（種子位，尚未填入隊伍）？\n\n${numGroups} 組 × 每組前 ${playoffTeams} 名 = ${totalTeams} 隊\n籤表將顯示為「Seed N Group X」等，您可稍後在「編輯季後賽籤表」中調整對戰組合。\n\n確定建立？`;
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const { data: existingPlayoffs } = await supabase
        .from("matches")
        .select("id")
        .eq("event_id", eventId)
        .gte("round", 1);

      if (existingPlayoffs && existingPlayoffs.length > 0) {
        toast.error("季後賽籤表已存在。請先刪除現有季後賽比賽後再建立。");
        setLoading(false);
        return;
      }

      await supabase.from("events").update({ playoff_qualifiers_per_group: playoffTeams }).eq("id", eventId);

      // Build round-1 slot positions: position i (0-based) = (seed, group), seed 1-based, group 1-based
      const positions: { seed: number; group: number }[] = [];
      for (let g = 1; g <= numGroups; g++) {
        for (let s = 1; s <= playoffTeams; s++) {
          positions.push({ seed: s, group: g });
        }
      }
      while (positions.length < bracketSize) {
        positions.push({ seed: 0, group: 0 }); // BYE placeholder
      }

      // Standard bracket order for round 1 (1v8, 4v5, 2v7, 3v6 for 8 teams)
      const seedOrder = getBracketSeedOrder(bracketSize);
      const playoffMatches: Array<{
        event_id: string;
        round: number;
        match_number: number;
        player1_id?: null;
        player2_id?: null;
        slot1_seed?: number;
        slot1_group?: number;
        slot2_seed?: number;
        slot2_group?: number;
        status: string;
      }> = [];
      let matchNumber = 1;
      for (let i = 0; i < bracketSize; i += 2) {
        const p1 = positions[seedOrder[i]];
        const p2 = positions[seedOrder[i + 1]];
        const isBye1 = p1.seed === 0;
        const isBye2 = p2.seed === 0;
        if (isBye1 && isBye2) continue;
        playoffMatches.push({
          event_id: eventId,
          round: 1,
          match_number: matchNumber++,
          player1_id: null,
          player2_id: null,
          ...(isBye1 ? {} : { slot1_seed: p1.seed, slot1_group: p1.group }),
          ...(isBye2 ? {} : { slot2_seed: p2.seed, slot2_group: p2.group }),
          status: isBye1 || isBye2 ? "bye" : "upcoming",
        });
      }

      for (let round = 2; round <= numRounds; round++) {
        const matchesInRound = Math.pow(2, numRounds - round);
        for (let i = 1; i <= matchesInRound; i++) {
          playoffMatches.push({
            event_id: eventId,
            round,
            match_number: i,
            player1_id: null,
            player2_id: null,
            status: "upcoming",
          });
        }
      }

      // 季軍賽：與決賽同 round，match_number = 2（決賽為 1）
      if (numRounds >= 2) {
        playoffMatches.push({
          event_id: eventId,
          round: numRounds,
          match_number: 2,
          player1_id: null,
          player2_id: null,
          status: "upcoming",
        });
      }

      const { error } = await supabase.from("matches").insert(playoffMatches);
      if (error) {
        toast.error(`建立失敗：${error.message}`);
        setLoading(false);
        return;
      }
      toast.success(`已建立季後賽籤表（種子位）。可至「管理籤表」編輯對戰組合，或等例行賽結束後填入隊伍。`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      console.error(e);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const generatePlayoffs = async () => {
    // Get regular season matches with group_number
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("*, player1:player1_id(id, name), player2:player2_id(id, name), winner:winner_id(id, name)")
      .eq("event_id", eventId)
      .eq("round", 0) // Regular season only
      .eq("status", "completed");

    if (matchesError) {
      toast.error(`Error fetching matches: ${matchesError.message}`);
      return;
    }

    if (!matches || matches.length === 0) {
      toast.error("No completed regular season matches found!");
      return;
    }

    // Get distinct group numbers
    const groupNumbers = [...new Set(matches.map((m: any) => m.group_number).filter((g: any) => g !== null))].sort((a, b) => a - b);
    
    if (groupNumbers.length === 0) {
      toast.error("No groups found in regular season matches! Please regenerate season matches first.");
      return;
    }

    // Calculate standings per group
    const groupStandings: { [groupNumber: number]: { [playerId: string]: { player: Player; wins: number; losses: number } } } = {};
    
    // Initialize group standings maps
    groupNumbers.forEach(groupNum => {
      groupStandings[groupNum] = {};
    });

    // Calculate wins/losses per group
    matches.forEach((match: any) => {
      const groupNum = match.group_number;
      if (!groupNum || !groupStandings[groupNum]) return;

      // Initialize players in this group if not already present
      if (match.player1_id && !groupStandings[groupNum][match.player1_id]) {
        const player1 = players.find(p => p.id === match.player1_id);
        if (player1) {
          groupStandings[groupNum][match.player1_id] = { player: player1, wins: 0, losses: 0 };
        }
      }
      if (match.player2_id && !groupStandings[groupNum][match.player2_id]) {
        const player2 = players.find(p => p.id === match.player2_id);
        if (player2) {
          groupStandings[groupNum][match.player2_id] = { player: player2, wins: 0, losses: 0 };
        }
      }

      if (match.winner_id && groupStandings[groupNum][match.winner_id]) {
        groupStandings[groupNum][match.winner_id].wins++;
        
        const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
        if (loserId && groupStandings[groupNum][loserId]) {
          groupStandings[groupNum][loserId].losses++;
        }
      }
    });

    // Build (seed, group) -> Player map. Seed is 1-based (1 = 1st in group).
    const seedGroupToPlayer: Record<string, Player> = {};
    for (const groupNum of groupNumbers) {
      const groupStandingsArray = Object.values(groupStandings[groupNum]);
      const sorted = groupStandingsArray.sort((a, b) => b.wins - a.wins);
      const topX = sorted.slice(0, playoffTeams);
      if (topX.length < playoffTeams) {
        toast.error(`Group ${groupNum} doesn't have enough players! Need ${playoffTeams}, have ${topX.length}`);
        return;
      }
      topX.forEach((standing, idx) => {
        const seed = idx + 1;
        seedGroupToPlayer[`${seed},${groupNum}`] = standing.player;
      });
    }

    // Fetch existing playoff bracket (admin-created dummy bracket with slot1/slot2 seed+group)
    const { data: existingPlayoffs, error: fetchPlayoffsError } = await supabase
      .from("matches")
      .select("id, round, match_number, slot1_seed, slot1_group, slot2_seed, slot2_group, status")
      .eq("event_id", eventId)
      .gte("round", 1);

    if (fetchPlayoffsError) {
      toast.error(`Error fetching playoff bracket: ${fetchPlayoffsError.message}`);
      return;
    }
    if (!existingPlayoffs || existingPlayoffs.length === 0) {
      toast.error("No playoff bracket found. Create one first with \"Create Playoff Bracket\" (seed slots only), then run Fill from Standings.");
      return;
    }

    // Confirm with group breakdown (from shared standings)
    const confirmLines = [`將依「現有季後賽籤表」填入隊伍（不更動籤表結構）。\n\n每組前 ${playoffTeams} 名：\n`];
    groupNumbers.forEach(groupNum => {
      const groupTop = playoffStandings.filter((s) => s.group === groupNum);
      confirmLines.push(`\n第 ${groupNum} 組：`);
      groupTop.forEach((row, idx) => {
        confirmLines.push(`  ${idx + 1}. ${row.player.name} (${row.wins}勝 ${row.losses}敗)`);
      });
    });
    confirmLines.push(`\n\n確定要依此名單填入現有籤表的每個種子位？`);
    if (!confirm(confirmLines.join("\n"))) return;

    setLoading(true);
    try {
      let filled = 0;
      for (const m of existingPlayoffs as Array<{
        id: string;
        round: number;
        match_number: number;
        slot1_seed: number | null;
        slot1_group: number | null;
        slot2_seed: number | null;
        slot2_group: number | null;
        status: string;
      }>) {
        const hasSlot1 = m.slot1_seed != null && m.slot1_group != null;
        const hasSlot2 = m.slot2_seed != null && m.slot2_group != null;
        const player1 = hasSlot1 ? seedGroupToPlayer[`${m.slot1_seed},${m.slot1_group}`] : null;
        const player2 = hasSlot2 ? seedGroupToPlayer[`${m.slot2_seed},${m.slot2_group}`] : null;

        const updates: { player1_id?: string | null; player2_id?: string | null; winner_id?: string | null } = {};
        if (hasSlot1) updates.player1_id = player1?.id ?? null;
        if (hasSlot2) updates.player2_id = player2?.id ?? null;
        if (m.status === "bye") {
          const winner = player1 ?? player2;
          if (winner) updates.winner_id = winner.id;
        }
        if (Object.keys(updates).length === 0) continue;

        const { error: updateError } = await supabase
          .from("matches")
          .update(updates)
          .eq("id", m.id);
        if (updateError) {
          toast.error(`Failed to update match R${m.round}-${m.match_number}: ${updateError.message}`);
          setLoading(false);
          return;
        }
        filled++;

        // BYE 場次：晉級者一併填入下一輪對應格位，避免第二輪仍空白
        if (m.status === "bye" && m.round >= 1) {
          const winner = player1 ?? player2;
          if (winner) {
            const nextRound = m.round + 1;
            const nextMatchNum = Math.ceil(m.match_number / 2);
            const isPlayer1Slot = m.match_number % 2 === 1;
            const nextMatch = existingPlayoffs.find(
              (x: { round: number; match_number: number }) => x.round === nextRound && x.match_number === nextMatchNum
            ) as { id: string } | undefined;
            if (nextMatch) {
              const nextUpdates = isPlayer1Slot ? { player1_id: winner.id } : { player2_id: winner.id };
              await supabase.from("matches").update(nextUpdates).eq("id", nextMatch.id);
            }
          }
        }
      }

      toast.success(`已依 standings 填入現有季後賽籤表，共更新 ${filled} 場對戰的隊伍。`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Error:", err);
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-ntu-green">
          🏀 Season Play - Generate Matches
        </h2>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Season Play Format:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>Regular Season</strong>: Teams are randomly split into groups, then round-robin within each group</li>
            <li><strong>Playoffs</strong>: Top teams enter single-elimination bracket</li>
            <li><strong>Standings</strong>: Calculated by wins in regular season</li>
            <li><strong>Scheduling</strong>: All matches start with TBD dates - you can manually schedule or import from CSV</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Groups
          </label>
          <input
            type="number"
            min={1}
            max={players.length}
            value={numGroups}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              setNumGroups(Math.max(1, Math.min(val, players.length)));
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
          />
          <p className="text-xs text-gray-500 mt-1">
            Teams will be randomly split into {numGroups} group{numGroups !== 1 ? 's' : ''}. Each group plays round-robin within the group.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Playoff Teams (Top X per group)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              max={64}
              value={playoffTeams}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) setPlayoffTeams(Math.min(64, Math.max(1, v)));
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green w-24"
            />
            <span className="text-gray-600 text-sm">per group</span>
            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase.from("events").update({ playoff_qualifiers_per_group: playoffTeams }).eq("id", eventId);
                if (error) toast.error(error.message);
                else toast.success("已儲存：每組前 " + playoffTeams + " 名進季後賽");
              }}
              className="px-3 py-2 border border-ntu-green text-ntu-green rounded-lg hover:bg-ntu-green hover:text-white text-sm font-medium"
            >
              儲存
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            每組前幾名進入季後賽（1–64）。可隨時修改並按「儲存」；若已建立季後賽籤表，改 X 後需刪除籤表再重新建立才會套用新名額。
          </p>
        </div>

        {/* 季後賽籤表結構預覽 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">🏆 季後賽籤表結構</h3>
          <p className="text-sm text-amber-800">
            {numGroups} 組 × 每組前 {playoffTeams} 名 = <strong>{numGroups * playoffTeams} 隊</strong> 進入季後賽
          </p>
          <p className="text-xs text-amber-700 mt-1">
            {(() => {
              const total = numGroups * playoffTeams;
              if (total <= 2) return "2 隊 → 決賽";
              if (total <= 4) return "4 隊 → 準決賽 → 決賽、季軍賽";
              if (total <= 8) return "8 隊 → 八強 → 準決賽 → 決賽、季軍賽";
              return `${total} 隊 → 單淘汰籤表（含季軍賽）`;
            })()}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={generateSeasonMatches}
          disabled={loading || players.length < 3}
          className="w-full bg-ntu-green text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : `🏁 Generate Regular Season (${players.length} players)`}
        </button>

        <button
          onClick={createPlayoffBracketTemplate}
          disabled={loading}
          className="w-full bg-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "..." : `📋 Create Playoff Bracket (${numGroups}×${playoffTeams} = seed slots only)`}
        </button>
        <p className="text-xs text-gray-500 -mt-1">
          Creates a bracket with &quot;Seed N Group X&quot; placeholders. You can edit who plays whom in Matches; names fill in when standings are set.
        </p>

        <button
          onClick={generatePlayoffs}
          disabled={loading}
          className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : `🏆 Fill Playoffs from Standings (Top ${playoffTeams})`}
        </button>
        <p className="text-xs text-gray-500 -mt-1">
          Uses your existing playoff bracket (Create Playoff Bracket + Edit Draw). Fills each seed slot with the actual player from current standings (e.g. Seed 1 Group A → 1st in Group A). Does not change bracket structure.
        </p>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>⚠️ <strong>Important:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>First &quot;Generate Regular Season&quot;, then &quot;Create Playoff Bracket&quot; to get a seed-only bracket</li>
          <li>Edit the draw in <strong>Matches</strong> (filter by Playoffs) to change which seed/group goes where</li>
          <li>After regular season is done, &quot;Fill Playoffs from Standings&quot; fills your existing bracket: each Seed N Group X slot gets the actual player from standings (does not replace or reseed the bracket)</li>
        </ul>
      </div>
    </div>
  );
}

