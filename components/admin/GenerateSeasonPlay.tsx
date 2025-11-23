"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Player } from "@/types/database";

interface GenerateSeasonPlayProps {
  eventId: string;
  players: Player[];
}

export default function GenerateSeasonPlay({ eventId, players }: GenerateSeasonPlayProps) {
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [numGroups, setNumGroups] = useState(1); // Default: 1 group (single round-robin)
  const [playoffTeams, setPlayoffTeams] = useState(4); // Default: top 4 teams go to playoffs
  const [hasBackup, setHasBackup] = useState(false);
  const supabase = createClient();

  // Check for backup on mount
  useEffect(() => {
    const checkBackup = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("matches_backup")
        .eq("id", eventId)
        .single();
      
      if (!error && data?.matches_backup) {
        const backup = data.matches_backup;
        if ((backup.matches && backup.matches.length > 0) || (backup.playoffs && backup.playoffs.length > 0)) {
          setHasBackup(true);
        }
      }
    };
    
    checkBackup();
  }, [eventId, supabase]);

  // Restore matches from backup
  const restoreMatches = async () => {
    if (!confirm("確定要恢復之前的比賽數據嗎？這將刪除當前的所有比賽並恢復備份的數據。")) {
      return;
    }

    setRestoreLoading(true);

    try {
      // Get backup data
      const { data: eventData, error: fetchError } = await supabase
        .from("events")
        .select("matches_backup")
        .eq("id", eventId)
        .single();

      if (fetchError || !eventData?.matches_backup) {
        toast.error("找不到備份數據");
        setRestoreLoading(false);
        return;
      }

      const backup = eventData.matches_backup;

      // Delete current matches
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("event_id", eventId);

      if (deleteError) {
        toast.error(`刪除當前比賽時出錯: ${deleteError.message}`);
        setRestoreLoading(false);
        return;
      }

      // Restore matches
      const matchesToRestore: any[] = [];
      
      if (backup.matches && backup.matches.length > 0) {
        matchesToRestore.push(...backup.matches);
      }
      
      if (backup.playoffs && backup.playoffs.length > 0) {
        matchesToRestore.push(...backup.playoffs);
      }

      if (matchesToRestore.length === 0) {
        toast.error("備份中沒有比賽數據");
        setRestoreLoading(false);
        return;
      }

      // Remove id and other auto-generated fields, let database create new ones
      const matchesToInsert = matchesToRestore.map(({ id, created_at, updated_at, ...match }) => match);

      const { error: insertError } = await supabase
        .from("matches")
        .insert(matchesToInsert);

      if (insertError) {
        toast.error(`恢復比賽時出錯: ${insertError.message}`);
        setRestoreLoading(false);
        return;
      }

      // Clear backup after successful restore
      await supabase
        .from("events")
        .update({ matches_backup: null })
        .eq("id", eventId);

      setHasBackup(false);
      toast.success(`✅ 已成功恢復 ${matchesToRestore.length} 場比賽！`);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Error:", err);
      toast.error("恢復時發生錯誤");
      setRestoreLoading(false);
    }
  };

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

    // Sort each group by wins (descending) and take top X from each
    const playoffPlayers: Player[] = [];
    const playoffStandings: Array<{ player: Player; wins: number; losses: number; group: number }> = [];

    groupNumbers.forEach(groupNum => {
      const groupStandingsArray = Object.values(groupStandings[groupNum]);
      const sorted = groupStandingsArray.sort((a, b) => b.wins - a.wins);
      const topX = sorted.slice(0, playoffTeams);
      
      if (topX.length < playoffTeams) {
        toast.error(`Group ${groupNum} doesn't have enough players! Need ${playoffTeams}, have ${topX.length}`);
        return;
      }

      topX.forEach(standing => {
        playoffPlayers.push(standing.player);
        playoffStandings.push({ ...standing, group: groupNum });
      });
    });

    if (playoffPlayers.length === 0) {
      toast.error("No players qualified for playoffs!");
      return;
    }

    // Sort playoff players by wins (descending) for seeding
    playoffStandings.sort((a, b) => b.wins - a.wins);
    const sortedPlayoffPlayers = playoffStandings.map(s => s.player);

    // Confirm with group breakdown
    const confirmLines = [`確定要生成季後賽籤表嗎？\n\n每組前 ${playoffTeams} 名進入季後賽：\n`];
    groupNumbers.forEach(groupNum => {
      const groupTop = playoffStandings.filter(s => s.group === groupNum);
      confirmLines.push(`\n第 ${groupNum} 組：`);
      groupTop.forEach((standing, idx) => {
        const player = standing.player;
        confirmLines.push(`  ${idx + 1}. ${player.name} (${standing.wins}勝 ${standing.losses}敗)`);
      });
    });
    confirmLines.push(`\n\n總共 ${playoffPlayers.length} 名選手進入季後賽\n\n確定生成？`);
    const confirmText = confirmLines.join('\n');
    
    if (!confirm(confirmText)) return;

    setLoading(true);

    try {
      // Backup existing playoff matches before deletion
      const { data: existingPlayoffs, error: fetchError } = await supabase
        .from("matches")
        .select("*")
        .eq("event_id", eventId)
        .gte("round", 1);

      if (fetchError) {
        toast.error(`Error fetching existing playoffs: ${fetchError.message}`);
        setLoading(false);
        return;
      }

      // Get current backup or create new one
      const { data: eventData } = await supabase
        .from("events")
        .select("matches_backup")
        .eq("id", eventId)
        .single();

      if (existingPlayoffs && existingPlayoffs.length > 0) {
        const backupData = eventData?.matches_backup || {};
        backupData.playoffs = existingPlayoffs;
        backupData.playoffs_backup_time = new Date().toISOString();
        
        const { error: backupError } = await supabase
          .from("events")
          .update({ matches_backup: backupData })
          .eq("id", eventId);

        if (backupError) {
          console.error("Failed to backup playoffs:", backupError);
        } else {
          toast.success(`已備份 ${existingPlayoffs.length} 場季後賽數據`);
        }
      }

      // Delete existing playoff matches (round >= 1)
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("event_id", eventId)
        .gte("round", 1);

      if (deleteError) {
        toast.error(`Error deleting existing playoffs: ${deleteError.message}`);
        setLoading(false);
        return;
      }

      // Generate single elimination playoff bracket
      // Calculate bracket size (next power of 2)
      const totalPlayoffPlayers = sortedPlayoffPlayers.length;
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalPlayoffPlayers)));
      const numRounds = Math.log2(bracketSize);

      // Seed players (top seed gets best position)
      const positions: (Player | null)[] = new Array(bracketSize).fill(null);
      
      // Standard seeding (1 vs lowest, 2 vs 2nd lowest, etc.)
      for (let i = 0; i < sortedPlayoffPlayers.length; i++) {
        positions[i] = sortedPlayoffPlayers[i];
      }

      // Generate first round matches
      const playoffMatches = [];
      let matchNumber = 1;
      
      for (let i = 0; i < bracketSize; i += 2) {
        const player1 = positions[i];
        const player2 = positions[i + 1];

        // Create match (with BYE if needed)
        if (player1 && !player2) {
          // BYE for player1
          playoffMatches.push({
            event_id: eventId,
            round: 1,
            match_number: matchNumber++,
            player1_id: player1.id,
            player2_id: null,
            status: "bye" as any,
            winner_id: player1.id,
          });
        } else if (player1 && player2) {
          playoffMatches.push({
            event_id: eventId,
            round: 1,
            match_number: matchNumber++,
            player1_id: player1.id,
            player2_id: player2.id,
            status: "upcoming",
          });
        }
      }

      // Create placeholder matches for later rounds
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

      // Insert playoff matches
      const { error: matchError } = await supabase
        .from("matches")
        .insert(playoffMatches);

      if (matchError) {
        toast.error(`Error creating playoff matches: ${matchError.message}`);
        setLoading(false);
        return;
      }

      toast.success(`✅ 季後賽籤表已生成！\n共 ${playoffMatches.filter(m => m.status !== 'bye').length} 場比賽\n${groupNumbers.length} 組，每組前 ${playoffTeams} 名，共 ${totalPlayoffPlayers} 名選手`);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
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
        {hasBackup && (
          <button
            onClick={restoreMatches}
            disabled={restoreLoading}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {restoreLoading ? "恢復中..." : "🔄 恢復之前的比賽"}
          </button>
        )}
      </div>
      
      {hasBackup && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            ⚠️ <strong>備份可用：</strong>檢測到之前的比賽備份。如果重置是誤操作，可以點擊上方的「恢復之前的比賽」按鈕來恢復。
          </p>
        </div>
      )}
      
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
            Number of Playoff Teams
          </label>
          <select
            value={playoffTeams}
            onChange={(e) => setPlayoffTeams(parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
          >
            <option value={2}>Top 2</option>
            <option value={4}>Top 4</option>
            <option value={8}>Top 8</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            How many top teams from each group will advance to the playoff bracket
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
          onClick={generatePlayoffs}
          disabled={loading}
          className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : `🏆 Generate Playoffs (Top ${playoffTeams})`}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>⚠️ <strong>Important:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>First click &quot;Generate Regular Season&quot; to create all round-robin matches</li>
          <li>After all regular season matches are completed, click &quot;Generate Playoffs&quot;</li>
          <li>Generating will delete any existing matches!</li>
        </ul>
      </div>
    </div>
  );
}

