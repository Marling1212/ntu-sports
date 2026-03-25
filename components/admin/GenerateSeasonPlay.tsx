"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Player } from "@/types/database";
import { deletePlayoffMatches } from "@/lib/actions/deletePlayoffMatches";

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
  /** When event has divisions (multi-sport), set on inserted matches */
  defaultDivisionId?: string | null;
}

export default function GenerateSeasonPlay({ eventId, players, initialQualifiersPerGroup, defaultDivisionId }: GenerateSeasonPlayProps) {
  const [loading, setLoading] = useState(false);
  const [numGroups, setNumGroups] = useState(1); // Default: 1 group (single round-robin)
  const [playoffTeams, setPlayoffTeams] = useState(initialQualifiersPerGroup ?? 4);
  const [playoffMatchCount, setPlayoffMatchCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (initialQualifiersPerGroup != null && initialQualifiersPerGroup >= 1) {
      setPlayoffTeams(Math.min(64, Math.max(1, initialQualifiersPerGroup)));
    }
  }, [initialQualifiersPerGroup]);

  // 偵測是否已有季後賽籤表（用來顯示「刪除季後賽籤表」按鈕）
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { count } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .gte("round", 1);
      setPlayoffMatchCount(count ?? 0);
    })();
  }, [eventId, supabase]);

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

      // Divide players into groups.
      // Seed-aware distribution:
      // - Take seeded teams ordered by seed.
      // - For each block of `numGroups` consecutive seeds, assign them to groups randomly (one per group).
      // - Fill remaining capacity with unseeded teams randomly.
      const seeded = players
        .filter((p: any) => p.seed != null)
        .sort((a: any, b: any) => (a.seed ?? 0) - (b.seed ?? 0));
      const unseeded = players.filter((p: any) => p.seed == null);

      const groupTargets = Array.from({ length: numGroups }, (_, g) => playersPerGroup + (g < remainder ? 1 : 0));
      const groups: Player[][] = Array.from({ length: numGroups }, () => []);

      // Place seeded players in seed-number blocks.
      for (let seedStart = 0; seedStart < seeded.length; seedStart += numGroups) {
        const block = seeded.slice(seedStart, seedStart + numGroups);
        const groupOrder = shuffleArray(Array.from({ length: numGroups }, (_, i) => i));
        for (let i = 0; i < block.length; i++) {
          groups[groupOrder[i]].push(block[i]);
        }
      }

      // Fill remaining slots with unseeded teams.
      const shuffledUnseeded = shuffleArray(unseeded);
      let u = 0;
      for (let g = 0; g < numGroups; g++) {
        while (groups[g].length < groupTargets[g] && u < shuffledUnseeded.length) {
          groups[g].push(shuffledUnseeded[u++]);
        }
      }

      // Fallback: if due to unexpected data we still have unplaced players, distribute them.
      if (u < shuffledUnseeded.length) {
        for (const p of shuffledUnseeded.slice(u)) {
          const targetGroup = groups.findIndex((gr, idx) => gr.length < groupTargets[idx]);
          if (targetGroup === -1) break;
          groups[targetGroup].push(p);
        }
      }

      // Generate round-robin matches within each group (Round 0)
      const divisionPayload = defaultDivisionId ? { division_id: defaultDivisionId } : {};
      const regularSeasonMatches = [];
      let globalMatchNumber = 1;

      for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex];

        // Round-robin within this group
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            regularSeasonMatches.push({
              ...divisionPayload,
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
    // Must be integer: 16-team bracket => 4 rounds (R1=8, R2=4, R3=2, R4=1)
    const numRounds = Math.floor(Math.log2(bracketSize));

    if (totalTeams < 2) {
      toast.error("Need at least 2 teams for playoffs (groups × qualifiers).");
      return;
    }

    const confirmMsg = `建立季後賽籤表（種子位，尚未填入隊伍）？\n\n${numGroups} 組 × 每組前 ${playoffTeams} 名 = ${totalTeams} 隊\n籤表將顯示為「Seed N Group X」等。若已有舊籤表會先清除再建立。\n\n確定建立？`;
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      // 先清除該賽事所有季後賽（Server Action），再建立，避免「籤表已存在」卡住
      const deleteResult = await deletePlayoffMatches(eventId);
      if (deleteResult.error) {
        toast.error(`無法清除舊籤表：${deleteResult.error}`);
        setLoading(false);
        return;
      }
      if (playoffMatchCount > 0 && deleteResult.deleted === 0) {
        toast.error("無法刪除舊季後賽籤表（請確認您為該賽事主辦方）。請在「比賽」頁手動刪除季後賽後再試。");
        setLoading(false);
        return;
      }
      if (deleteResult.deleted > 0) {
        toast.success(`已清除 ${deleteResult.deleted} 場舊季後賽，正在建立新籤表…`);
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
      const playoffDivisionPayload = defaultDivisionId ? { division_id: defaultDivisionId } : {};
      const seedOrder = getBracketSeedOrder(bracketSize);
      const playoffMatches: Array<{
        event_id: string;
        division_id?: string;
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
          ...playoffDivisionPayload,
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

      // Rounds 2..numRounds: 八強、四強、決賽。若上一輪為 BYE，晉級的 Seed X Group Y 帶入下一輪 slot，不顯示 TBD
      for (let round = 2; round <= numRounds; round++) {
        const matchesInRound = Math.floor(bracketSize / Math.pow(2, round));
        const prevRound = round - 1;
        for (let i = 1; i <= matchesInRound; i++) {
          const prevMatch1Num = (i - 1) * 2 + 1;
          const prevMatch2Num = (i - 1) * 2 + 2;
          const prev1 = playoffMatches.find((m) => m.round === prevRound && m.match_number === prevMatch1Num);
          const prev2 = playoffMatches.find((m) => m.round === prevRound && m.match_number === prevMatch2Num);
          const advancingSlot1 =
            prev1?.status === "bye"
              ? prev1.slot1_seed != null
                ? { slot1_seed: prev1.slot1_seed, slot1_group: prev1.slot1_group! }
                : { slot1_seed: prev1.slot2_seed!, slot1_group: prev1.slot2_group! }
              : {};
          const advancingSlot2 =
            prev2?.status === "bye"
              ? prev2.slot1_seed != null
                ? { slot2_seed: prev2.slot1_seed, slot2_group: prev2.slot1_group! }
                : { slot2_seed: prev2.slot2_seed!, slot2_group: prev2.slot2_group! }
              : {};
          playoffMatches.push({
            ...playoffDivisionPayload,
            event_id: eventId,
            round,
            match_number: i,
            player1_id: null,
            player2_id: null,
            ...advancingSlot1,
            ...advancingSlot2,
            status: "upcoming",
          });
        }
      }

      // 季軍賽：與決賽同 round，match_number = 2（決賽為 1）
      if (numRounds >= 2) {
        playoffMatches.push({
          ...playoffDivisionPayload,
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

  /** 刪除本賽事所有季後賽比賽（round >= 1），改由 Server Action 執行以確保權限正確。 */
  const deletePlayoffBracket = async () => {
    if (playoffMatchCount === 0) return;
    const msg = `確定要刪除「季後賽籤表」嗎？\n\n將刪除本賽事全部 ${playoffMatchCount} 場季後賽比賽（第一輪～決賽、季軍賽），此操作無法復原。\n\n刪除後可再按「建立季後賽籤表」重新建立（例如改為 10 隊的 16 格籤表）。`;
    if (!confirm(msg)) return;
    setLoading(true);
    try {
      const result = await deletePlayoffMatches(eventId);
      if (result.error) {
        toast.error(`刪除失敗：${result.error}`);
        setLoading(false);
        return;
      }
      if (result.deleted === 0) {
        toast.error("未刪除任何季後賽比賽（請確認您為該賽事主辦方）。請重新整理頁面後再試。");
        setLoading(false);
        return;
      }
      setPlayoffMatchCount(0);
      toast.success(`已刪除 ${result.deleted} 場季後賽。可重新建立籤表。`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      console.error(e);
      toast.error("刪除時發生錯誤");
    } finally {
      setLoading(false);
    }
  };

  const generatePlayoffs = async () => {
    const { syncLockedPlayoffSeeds } = await import("@/lib/actions/syncLockedPlayoffSeeds");
    const decidedStatuses = ["completed", "forfeit", "walkover"] as const;

    // Safety: only allow filling playoffs once *all* group games are decided.
    const { data: allR0Matches, error: allR0Err } = await supabase
      .from("matches")
      .select("id,status,group_number")
      .eq("event_id", eventId)
      .eq("round", 0);

    if (allR0Err) {
      toast.error(`Error fetching regular season matches: ${allR0Err.message}`);
      return;
    }

    if (!allR0Matches || allR0Matches.length === 0) {
      toast.error("No regular season matches found for this event.");
      return;
    }

    const allRegularComplete = allR0Matches.every((m: any) => decidedStatuses.includes(m.status));
    if (!allRegularComplete) {
      toast.error("請先完成所有例行賽比賽（每組所有場次）後再進行「填入季後賽」。");
      return;
    }

    await syncLockedPlayoffSeeds(eventId);

    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("tiebreaker_config, registration_type")
      .eq("id", eventId)
      .single();

    if (eventErr) {
      toast.error(`無法讀取賽事設定：${eventErr.message}`);
      return;
    }

    // Same decided statuses as lib/standings/compute (not only "completed")
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("*, player1:player1_id(id, name), player2:player2_id(id, name), winner:winner_id(id, name)")
      .eq("event_id", eventId)
      .eq("round", 0)
      .in("status", ["completed", "forfeit", "walkover"]);

    if (matchesError) {
      toast.error(`Error fetching matches: ${matchesError.message}`);
      return;
    }

    if (!matches || matches.length === 0) {
      toast.error("No decided regular season matches found (completed / forfeit / walkover)!");
      return;
    }

    const groupNumbers = [...new Set(matches.map((m: any) => m.group_number).filter((g: any) => g !== null && g !== ""))].sort(
      (a, b) => a - b
    );

    if (groupNumbers.length === 0) {
      toast.error(
        "例行賽比賽缺少 group_number。若季後賽只有一組，請先儲存任一場例行賽比分以同步；若有多組，請在資料庫為各場比賽標示組別後再試。"
      );
      return;
    }

    let matchPlayerStats: Array<Record<string, unknown>> = [];
    let teamMembers: Array<{ id: string; player_id: string }> = [];
    const { data: stats } = await supabase.from("match_player_stats").select("*").in(
      "match_id",
      matches.map((m: { id: string }) => m.id)
    );
    matchPlayerStats = stats || [];

    const regType = ((eventRow as any)?.registration_type as "player" | "team") || "player";
    if (regType === "team" && players.length > 0) {
      const teamIds = players.filter((p) => (p as any).type === "team").map((p) => p.id);
      if (teamIds.length > 0) {
        const { data: members } = await supabase.from("team_members").select("id, player_id").in("player_id", teamIds);
        teamMembers = (members || []) as Array<{ id: string; player_id: string }>;
      }
    }

    const regularForStandings = matches.map((m: any) => ({
      player1_id: m.player1_id,
      player2_id: m.player2_id,
      winner_id: m.winner_id,
      score1: m.score1,
      score2: m.score2,
      status: m.status,
      round: m.round,
      group_number: m.group_number,
    }));

    const { computeStandings, normalizeTiebreakerConfig } = await import("@/lib/standings");
    const config = normalizeTiebreakerConfig((eventRow as any)?.tiebreaker_config);
    const playersForStandings = players.map((p) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
      school: p.department,
    }));

    const standingsByGroup = computeStandings(regularForStandings as any, playersForStandings as any, config, {
      matchPlayerStats: matchPlayerStats as any,
      teamMembers,
      registrationType: regType,
    }) as Record<number, import("@/lib/standings").StandingRow[]>;

    // Build (seed, group) -> Player map. Seed order = computeStandings order (same as public standings).
    const seedGroupToPlayer: Record<string, Player> = {};
    for (const groupNum of groupNumbers) {
      const rows = standingsByGroup[groupNum] || [];
      if (rows.length < playoffTeams) {
        toast.error(`第 ${groupNum} 組戰績隊伍不足：需要至少 ${playoffTeams} 隊，目前 ${rows.length} 隊`);
        return;
      }
      const topX = rows.slice(0, playoffTeams);
      topX.forEach((row, idx) => {
        const seed = idx + 1;
        const pl = players.find((p) => p.id === row.player.id);
        if (pl) seedGroupToPlayer[`${seed},${groupNum}`] = pl;
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

    // Confirm with group breakdown (from groupStandings)
    const confirmLines = [`將依「現有季後賽籤表」填入隊伍（不更動籤表結構）。\n\n每組前 ${playoffTeams} 名：\n`];
    groupNumbers.forEach((groupNum) => {
      const rows = standingsByGroup[groupNum] || [];
      const groupTop = rows.slice(0, playoffTeams);
      confirmLines.push(`\n第 ${groupNum} 組：`);
      groupTop.forEach((row, idx) => {
        confirmLines.push(
          `  ${idx + 1}. ${row.player.name}（${row.points} 分，GD ${row.goalDiff}，${row.wins}勝 ${row.losses}敗 ${row.draws || 0}和）`
        );
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
            <li><strong>Standings / Fill playoffs</strong>: Uses the same ranking rules as the public page (event tiebreaker settings + points / GD / H2H / fair play as configured)</li>
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

        <div className="flex flex-col gap-2">
          <button
            onClick={createPlayoffBracketTemplate}
            disabled={loading}
            className="w-full bg-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : `📋 建立季後賽籤表（${numGroups}×${playoffTeams} = 種子位）`}
          </button>
          {playoffMatchCount > 0 && (
            <button
              type="button"
              onClick={deletePlayoffBracket}
              disabled={loading}
              className="w-full border-2 border-red-500 text-red-600 py-2 px-4 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ 刪除季後賽籤表（目前 {playoffMatchCount} 場）
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 -mt-1">
          建立後籤表會顯示「Seed N Group X」等種子位；可至「比賽」編輯對戰組合，或例行賽結束後用「從排名填入」套用隊伍。
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

