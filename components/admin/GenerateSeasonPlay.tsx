"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Player } from "@/types/database";

interface GenerateSeasonPlayProps {
  eventId: string;
  players: Player[];
}

export default function GenerateSeasonPlay({ eventId, players }: GenerateSeasonPlayProps) {
  const [loading, setLoading] = useState(false);
  const [playoffTeams, setPlayoffTeams] = useState(4); // Default: top 4 teams go to playoffs
  const supabase = createClient();

  const generateSeasonMatches = async () => {
    if (players.length < 3) {
      toast.error(`Season play requires at least 3 players. Currently have ${players.length} players.`);
      return;
    }

    if (playoffTeams >= players.length) {
      toast.error(`Playoff teams (${playoffTeams}) must be less than total players (${players.length})`);
      return;
    }

    const totalRegularSeasonMatches = (players.length * (players.length - 1)) / 2; // Round robin
    const confirmText = `確定要生成季賽賽程嗎？\n\n選手數: ${players.length}\n\n常規賽:\n- 採用單循環制 (每人對每人一次)\n- 總比賽數: ${totalRegularSeasonMatches} 場\n\n季後賽:\n- 前 ${playoffTeams} 名進入季後賽\n- 採用單淘汰制\n\n確定生成？`;
    
    if (!confirm(confirmText)) return;

    setLoading(true);

    try {
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

      // Generate round-robin regular season matches (Round 0)
      const regularSeasonMatches = [];
      let matchNumber = 1;

      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          regularSeasonMatches.push({
            event_id: eventId,
            round: 0, // Round 0 = Regular Season
            match_number: matchNumber++,
            player1_id: players[i].id,
            player2_id: players[j].id,
            status: "upcoming",
          });
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

      toast.success(`✅ 已生成 ${regularSeasonMatches.length} 場常規賽！\n\n⚠️ 常規賽結束後，請手動點擊「生成季後賽」按鈕`);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Error:", err);
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  };

  const generatePlayoffs = async () => {
    // Get regular season standings (by wins)
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

    // Calculate standings
    const standings: { [playerId: string]: { player: Player; wins: number; losses: number } } = {};
    
    players.forEach(player => {
      standings[player.id] = { player, wins: 0, losses: 0 };
    });

    matches.forEach((match: any) => {
      if (match.winner_id) {
        standings[match.winner_id].wins++;
        const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
        if (loserId && standings[loserId]) {
          standings[loserId].losses++;
        }
      }
    });

    // Sort by wins (descending)
    const sortedPlayers = Object.values(standings).sort((a, b) => b.wins - a.wins);

    if (sortedPlayers.length < playoffTeams) {
      toast.error(`Not enough players for playoffs! Need ${playoffTeams}, have ${sortedPlayers.length}`);
      return;
    }

    // Get top N players
    const playoffPlayers = sortedPlayers.slice(0, playoffTeams).map(s => s.player);

    // Confirm
    const confirmText = `確定要生成季後賽籤表嗎？\n\n進入季後賽的選手（前 ${playoffTeams} 名）:\n${playoffPlayers.map((p, i) => `${i + 1}. ${p.name} (${sortedPlayers[i].wins}勝 ${sortedPlayers[i].losses}敗)`).join('\n')}\n\n確定生成？`;
    
    if (!confirm(confirmText)) return;

    setLoading(true);

    try {
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
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(playoffTeams)));
      const numRounds = Math.log2(bracketSize);

      // Seed players (top seed gets best position)
      const positions: (Player | null)[] = new Array(bracketSize).fill(null);
      
      // Standard seeding (1 vs lowest, 2 vs 2nd lowest, etc.)
      for (let i = 0; i < playoffPlayers.length; i++) {
        positions[i] = playoffPlayers[i];
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

      toast.success(`✅ 季後賽籤表已生成！\n共 ${playoffMatches.filter(m => m.status !== 'bye').length} 場比賽`);
      
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
      <h2 className="text-2xl font-semibold text-ntu-green mb-4">
        🏀 Season Play - Generate Matches
      </h2>
      
      <div className="space-y-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Season Play Format:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>Regular Season</strong>: Round-robin (every player plays every other player once)</li>
            <li><strong>Playoffs</strong>: Top teams enter single-elimination bracket</li>
            <li><strong>Standings</strong>: Calculated by wins in regular season</li>
          </ul>
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
            How many top teams will advance to the playoff bracket
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

