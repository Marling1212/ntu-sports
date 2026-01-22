"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Player } from "@/types/database";

interface BracketSeedingManagerProps {
  eventId: string;
  players: Player[];
  matches: any[];
  tournamentType: "single_elimination" | "season_play" | null;
  onSeedingUpdated: () => void;
}

export default function BracketSeedingManager({
  eventId,
  players,
  matches,
  tournamentType,
  onSeedingUpdated,
}: BracketSeedingManagerProps) {
  const [loading, setLoading] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [bracketPositions, setBracketPositions] = useState<Map<number, string>>(new Map());
  const [groupStandings, setGroupStandings] = useState<any[]>([]);
  const supabase = createClient();

  // Get playoff matches (round >= 1) - handle null/undefined matches
  const playoffMatches = (matches || []).filter(m => m && m.round >= 1);
  const firstRoundMatches = playoffMatches.filter(m => m && m.round === 1);
  
  // Calculate bracket size - if no matches exist, use a default or calculate from available players
  let bracketSize = firstRoundMatches.length * 2;
  if (bracketSize === 0) {
    // Default to next power of 2 based on available players
    const availableCount = tournamentType === "season_play" 
      ? (groupStandings.length || 0)
      : (players.length || 0);
    bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(availableCount, 2))));
  }

  // Load group standings for season play
  useEffect(() => {
    if (tournamentType === "season_play" && showManager) {
      loadGroupStandings();
    }
  }, [tournamentType, showManager]);

  // Initialize bracket positions from existing matches
  useEffect(() => {
    if (showManager) {
      if (firstRoundMatches.length > 0) {
        const positions = new Map<number, string>();
        firstRoundMatches.forEach((match, index) => {
          if (match) {
            const pos1 = index * 2;
            const pos2 = index * 2 + 1;
            if (match.player1_id) positions.set(pos1, match.player1_id);
            if (match.player2_id) positions.set(pos2, match.player2_id);
          }
        });
        setBracketPositions(positions);
      } else {
        // No existing matches - start with empty positions
        setBracketPositions(new Map());
      }
    }
  }, [showManager, firstRoundMatches]);

  const loadGroupStandings = async () => {
    try {
      const { data: regularMatches } = await supabase
        .from("matches")
        .select("*, player1:player1_id(id, name), player2:player2_id(id, name), winner:winner_id(id, name)")
        .eq("event_id", eventId)
        .eq("round", 0)
        .eq("status", "completed");

      if (!regularMatches) return;

      // Calculate standings per group
      const standingsMap: { [key: number]: { [playerId: string]: { player: Player; wins: number; losses: number } } } = {};
      
      regularMatches.forEach((match: any) => {
        const groupNum = match.group_number || 1;
        if (!standingsMap[groupNum]) standingsMap[groupNum] = {};

        if (match.player1_id && !standingsMap[groupNum][match.player1_id]) {
          const player = players.find(p => p.id === match.player1_id);
          if (player) {
            standingsMap[groupNum][match.player1_id] = { player, wins: 0, losses: 0 };
          }
        }
        if (match.player2_id && !standingsMap[groupNum][match.player2_id]) {
          const player = players.find(p => p.id === match.player2_id);
          if (player) {
            standingsMap[groupNum][match.player2_id] = { player, wins: 0, losses: 0 };
          }
        }

        if (match.winner_id && standingsMap[groupNum][match.winner_id]) {
          standingsMap[groupNum][match.winner_id].wins++;
          const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
          if (loserId && standingsMap[groupNum][loserId]) {
            standingsMap[groupNum][loserId].losses++;
          }
        }
      });

      // Convert to array and sort
      const standings: any[] = [];
      Object.keys(standingsMap).forEach(groupNum => {
        const groupStandings = Object.values(standingsMap[parseInt(groupNum)]);
        const sorted = groupStandings.sort((a, b) => b.wins - a.wins);
        sorted.forEach((standing, rank) => {
          standings.push({
            ...standing,
            group: parseInt(groupNum),
            rank: rank + 1,
          });
        });
      });

      setGroupStandings(standings);
    } catch (error: any) {
      console.error("Error loading standings:", error);
    }
  };

  const assignPlayerToPosition = (position: number, playerId: string) => {
    const newPositions = new Map(bracketPositions);
    newPositions.set(position, playerId);
    setBracketPositions(newPositions);
  };

  const randomizeBracket = () => {
    if (!confirm("確定要隨機化籤表嗎？這將清除所有現有的位置分配。")) return;

    const availablePlayers = tournamentType === "season_play" 
      ? groupStandings.map(s => s.player.id)
      : players.map(p => p.id);

    // Shuffle players
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);

    const newPositions = new Map<number, string>();
    shuffled.forEach((playerId, index) => {
      if (index < bracketSize) {
        newPositions.set(index, playerId);
      }
    });

    setBracketPositions(newPositions);
    toast.success("籤表已隨機化");
  };

  const applySeeding = async () => {
    if (bracketPositions.size === 0) {
      toast.error("請至少分配一個位置");
      return;
    }

    setLoading(true);

    try {
      // Delete existing first round matches
      await supabase
        .from("matches")
        .delete()
        .eq("event_id", eventId)
        .eq("round", 1);

      // Delete all playoff matches (round >= 1)
      await supabase
        .from("matches")
        .delete()
        .eq("event_id", eventId)
        .gte("round", 1);

      // Create new first round matches
      const newMatches: any[] = [];
      let matchNumber = 1;

      for (let i = 0; i < bracketSize; i += 2) {
        const player1Id = bracketPositions.get(i) || null;
        const player2Id = bracketPositions.get(i + 1) || null;

        if (player1Id && !player2Id) {
          // BYE for player1
          newMatches.push({
            event_id: eventId,
            round: 1,
            match_number: matchNumber++,
            player1_id: player1Id,
            player2_id: null,
            status: "bye",
            winner_id: player1Id,
          });
        } else if (!player1Id && player2Id) {
          // BYE for player2
          newMatches.push({
            event_id: eventId,
            round: 1,
            match_number: matchNumber++,
            player1_id: null,
            player2_id: player2Id,
            status: "bye",
            winner_id: player2Id,
          });
        } else if (player1Id && player2Id) {
          // Normal match
          newMatches.push({
            event_id: eventId,
            round: 1,
            match_number: matchNumber++,
            player1_id: player1Id,
            player2_id: player2Id,
            status: "upcoming",
          });
        } else {
          // Empty match (both BYE - shouldn't happen but handle it)
          newMatches.push({
            event_id: eventId,
            round: 1,
            match_number: matchNumber++,
            player1_id: null,
            player2_id: null,
            status: "upcoming",
          });
        }
      }

      // Calculate number of rounds needed
      const numRounds = Math.ceil(Math.log2(bracketSize));
      
      // Create placeholder matches for later rounds
      for (let round = 2; round <= numRounds; round++) {
        const matchesInRound = Math.pow(2, numRounds - round);
        for (let i = 1; i <= matchesInRound; i++) {
          newMatches.push({
            event_id: eventId,
            round,
            match_number: i,
            player1_id: null,
            player2_id: null,
            status: "upcoming",
          });
        }
      }

      // Insert all matches
      const { error } = await supabase
        .from("matches")
        .insert(newMatches);

      if (error) throw error;

      toast.success("籤表已更新！");
      onSeedingUpdated();
      setShowManager(false);
    } catch (error: any) {
      toast.error(`錯誤: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!showManager) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-ntu-green mb-2">籤表管理</h3>
            <p className="text-sm text-gray-600">
              手動分配選手到籤表位置，或隨機化籤表
            </p>
          </div>
          <button
            onClick={() => setShowManager(true)}
            className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            🎯 管理籤表
          </button>
        </div>
      </div>
    );
  }

  const availablePlayers = tournamentType === "season_play" 
    ? groupStandings.map(s => s.player)
    : players;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-ntu-green">籤表管理</h3>
        <button
          onClick={() => setShowManager(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕ 關閉
        </button>
      </div>

      {tournamentType === "season_play" && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">小組排名</h4>
          <div className="space-y-2 text-sm">
            {groupStandings.length > 0 ? (
              groupStandings.map((standing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-medium">第 {standing.group} 組 第 {standing.rank} 名:</span>
                  <span>{standing.player.name}</span>
                  <span className="text-gray-500">({standing.wins}勝 {standing.losses}敗)</span>
                </div>
              ))
            ) : (
              <p className="text-gray-600">請先完成常規賽並計算排名</p>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <button
          onClick={randomizeBracket}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90"
        >
          🎲 隨機化籤表
        </button>
        <button
          onClick={applySeeding}
          disabled={loading}
          className="bg-ntu-green text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "應用中..." : "✓ 應用籤表"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: bracketSize }, (_, i) => {
          const playerId = bracketPositions.get(i);
          const player = playerId ? availablePlayers.find(p => p.id === playerId) : null;
          const matchIndex = Math.floor(i / 2);
          const isTop = i % 2 === 0;

          return (
            <div
              key={i}
              className={`p-4 border-2 rounded-lg ${
                player ? "border-ntu-green bg-green-50" : "border-gray-300 bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">
                  位置 {i + 1} {isTop ? "(上)" : "(下)"} - 比賽 {matchIndex + 1}
                </span>
                {player && (
                  <button
                    onClick={() => {
                      const newPositions = new Map(bracketPositions);
                      newPositions.delete(i);
                      setBracketPositions(newPositions);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={playerId || ""}
                onChange={(e) => {
                  if (e.target.value) {
                    assignPlayerToPosition(i, e.target.value);
                  } else {
                    const newPositions = new Map(bracketPositions);
                    newPositions.delete(i);
                    setBracketPositions(newPositions);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">選擇選手...</option>
                {availablePlayers.map((p) => (
                  <option key={p.id} value={p.id} disabled={bracketPositions.has(i) && bracketPositions.get(i) !== p.id && Array.from(bracketPositions.values()).includes(p.id)}>
                    {p.seed ? `[${p.seed}] ` : ""}
                    {p.name}
                    {tournamentType === "season_play" && groupStandings.find(s => s.player.id === p.id) && (
                      ` (第${groupStandings.find(s => s.player.id === p.id)?.group}組 第${groupStandings.find(s => s.player.id === p.id)?.rank}名)`
                    )}
                  </option>
                ))}
              </select>
              {player && (
                <div className="mt-2 text-sm text-gray-700">
                  <div className="font-medium">{player.name}</div>
                  {player.seed && (
                    <div className="text-xs text-gray-500">種子: {player.seed}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
