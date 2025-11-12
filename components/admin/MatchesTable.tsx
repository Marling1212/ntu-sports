"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { Player } from "@/types/database";
import { checkAndAnnounceRoundCompletion } from "@/lib/utils/checkRoundCompletion";

interface Match {
  id: string;
  event_id: string;
  round: number;
  match_number: number;
  player1_id?: string;
  player2_id?: string;
  score1?: string;
  score2?: string;
  winner_id?: string;
  court?: string;
  scheduled_time?: string;
  status: string;
  player1?: Player;
  player2?: Player;
  winner?: Player;
}

interface MatchesTableProps {
  eventId: string;
  initialMatches: Match[];
  players: Player[];
  tournamentType?: "single_elimination" | "season_play" | null;
}

export default function MatchesTable({ eventId, initialMatches, players, tournamentType }: MatchesTableProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const supabase = createClient();

  const handleEdit = (match: Match) => {
    setEditingMatch(match.id);
    setEditForm({
      score1: match.score1 || "",
      score2: match.score2 || "",
      winner_id: match.winner_id || "",
      court: match.court || "",
      status: match.status || "upcoming",
    });
  };

  const handleSave = async (matchId: string) => {
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;

    // Check if status changed to "live"
    const isNowLive = editForm.status === "live" && currentMatch.status !== "live";

    // Update current match
    const { data, error } = await supabase
      .from("matches")
      .update({
        score1: editForm.score1 || null,
        score2: editForm.score2 || null,
        winner_id: editForm.winner_id || null,
        court: editForm.court || null,
        status: editForm.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select(`
        *,
        player1:players!matches_player1_id_fkey(id, name, seed),
        player2:players!matches_player2_id_fkey(id, name, seed),
        winner:players!matches_winner_id_fkey(id, name, seed)
      `)
      .single();

    if (error) {
      toast.error(`Error: ${error.message}`);
      return;
    }

    // If status changed to "live", create an announcement
    if (isNowLive && data.player1 && data.player2) {
      const player1Name = data.player1.name || "TBD";
      const player2Name = data.player2.name || "TBD";
      const court = editForm.court || "TBA";
      
      const announcementTitle = `🎾 Match Now Live!`;
      const announcementContent = `${player1Name} vs ${player2Name} is now starting on Court ${court}. Please head to the court!`;
      
      const { error: announcementError } = await supabase
        .from("announcements")
        .insert({
          event_id: eventId,
          title: announcementTitle,
          content: announcementContent,
          created_at: new Date().toISOString(),
        });
      
      if (announcementError) {
        console.error("Error creating announcement:", announcementError);
      } else {
        console.log("Announcement created for live match");
      }
    }

    // If a winner was set, advance them to the next round
    if (editForm.winner_id && currentMatch.round) {
      console.log("=== Winner Advancement Debug ===");
      console.log("Current match:", currentMatch);
      console.log("Winner ID:", editForm.winner_id);
      console.log("Current round:", currentMatch.round);
      console.log("Current match number:", currentMatch.match_number);
      
      const nextRound = currentMatch.round + 1;
      const nextMatchNumber = Math.ceil(currentMatch.match_number / 2);
      
      console.log("Next round:", nextRound);
      console.log("Next match number:", nextMatchNumber);
      
      // Determine if winner goes to player1 or player2 slot
      // Odd match numbers (1, 3, 5...) feed into player1
      // Even match numbers (2, 4, 6...) feed into player2
      const isPlayer1Slot = currentMatch.match_number % 2 === 1;
      console.log("Winner goes to:", isPlayer1Slot ? "Player 1 slot" : "Player 2 slot");
      
      // Find the next round match
      const nextMatch = matches.find(
        m => m.round === nextRound && m.match_number === nextMatchNumber
      );
      
      console.log("Next match found:", nextMatch);
      
      if (nextMatch) {
        // Update next round match with the winner
        const updateData = isPlayer1Slot 
          ? { player1_id: editForm.winner_id, updated_at: new Date().toISOString() }
          : { player2_id: editForm.winner_id, updated_at: new Date().toISOString() };
        
        console.log("Update data:", updateData);
        console.log("Updating match ID:", nextMatch.id);
        
        const { data: nextMatchData, error: nextMatchError } = await supabase
          .from("matches")
          .update(updateData)
          .eq("id", nextMatch.id)
          .select(`
            *,
            player1:players!matches_player1_id_fkey(id, name, seed),
            player2:players!matches_player2_id_fkey(id, name, seed),
            winner:players!matches_winner_id_fkey(id, name, seed)
          `)
          .single();
        
        console.log("Next match update result:", nextMatchData);
        console.log("Next match update error:", nextMatchError);
        
        if (nextMatchError) {
          console.error("❌ Error updating next round:", nextMatchError);
          toast.error(`Failed to advance winner: ${nextMatchError.message}`);
        } else {
          console.log("✅ Successfully updated next round!");
          
          // Check if this is a semifinal match - if so, advance loser to 3rd place match
          const maxRound = Math.max(...matches.map(m => m.round));
          const isSemifinal = currentMatch.round === maxRound - 1;
          
          if (isSemifinal && editForm.winner_id) {
            console.log("🥉 This is a semifinal! Checking for 3rd place match...");
            
            // Find loser
            const loserId = currentMatch.player1_id === editForm.winner_id 
              ? currentMatch.player2_id 
              : currentMatch.player1_id;
            
            if (loserId) {
              // Find 3rd place match (match_number = 2 in final round)
              const thirdPlaceMatch = matches.find(
                m => m.round === maxRound && m.match_number === 2
              );
              
              if (thirdPlaceMatch) {
                console.log("Found 3rd place match:", thirdPlaceMatch);
                
                // Determine which slot to fill (fill player1 first, then player2)
                const slotToFill = !thirdPlaceMatch.player1_id ? 'player1_id' : 'player2_id';
                
                const { data: thirdPlaceData, error: thirdPlaceError } = await supabase
                  .from("matches")
                  .update({
                    [slotToFill]: loserId,
                    updated_at: new Date().toISOString()
                  })
                  .eq("id", thirdPlaceMatch.id)
                  .select(`
                    *,
                    player1:players!matches_player1_id_fkey(id, name, seed),
                    player2:players!matches_player2_id_fkey(id, name, seed),
                    winner:players!matches_winner_id_fkey(id, name, seed)
                  `)
                  .single();
                
                if (!thirdPlaceError) {
                  console.log("✅ Loser advanced to 3rd place match!");
                  setMatches(matches.map(m => {
                    if (m.id === matchId) return data;
                    if (m.id === nextMatch.id) return nextMatchData;
                    if (m.id === thirdPlaceMatch.id) return thirdPlaceData;
                    return m;
                  }));
                }
              }
            }
          } else {
            // Update local state with both matches
            setMatches(matches.map(m => {
              if (m.id === matchId) return data;
              if (m.id === nextMatch.id) return nextMatchData;
              return m;
            }));
          }
          
          setEditingMatch(null);
          
          // Check if this round is now completed and create announcement
          console.log(`Match completed, checking if Round ${currentMatch.round} is done...`);
          checkAndAnnounceRoundCompletion(eventId, currentMatch.round).then((announced) => {
            if (announced) {
              toast.success("🎉 Round completed! Announcement posted. Refreshing...");
            } else {
              toast.success("Match updated! Winner advanced to next round. Refreshing...");
            }
            
            // Force refresh after a short delay
            setTimeout(() => {
              window.location.href = window.location.href;
            }, 1500);
          });
          return;
        }
      } else {
        console.warn("⚠️ Next round match not found!");
        console.log("Available matches:", matches.map(m => ({ id: m.id, round: m.round, match_number: m.match_number })));
      }
    }

    // If no next round update needed, just update current match
    setMatches(matches.map(m => m.id === matchId ? data : m));
    setEditingMatch(null);
    
    // Check if this round is now completed and create announcement
    if (editForm.status === "completed" && editForm.winner_id) {
      console.log(`Match completed, checking if Round ${currentMatch.round} is done...`);
      checkAndAnnounceRoundCompletion(eventId, currentMatch.round).then((announced) => {
        if (announced) {
          toast.success("🎉 Round completed! Announcement posted.");
        }
      });
    }
    
    if (isNowLive) {
      toast.success("Match is now LIVE! Announcement posted.");
    } else {
      toast.success("Match updated successfully!");
    }
  };

  const handleCancel = () => {
    setEditingMatch(null);
    setEditForm({});
  };

  // Calculate dynamic round names based on actual bracket
  const maxRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
  const playoffMatches = matches.filter(match => match.round > 0);
  const maxPlayoffRound = playoffMatches.length > 0 ? Math.max(...playoffMatches.map(match => match.round)) : 0;

  const describeEliminationRound = (round: number, referenceMaxRound: number): string => {
    if (referenceMaxRound === 0) {
      return `Round ${round}`;
    }
    if (round === referenceMaxRound) return "Final";
    if (round === referenceMaxRound - 1) return "Semifinals";
    if (round === referenceMaxRound - 2) return "Quarterfinals";

    const playersInRound = Math.pow(2, referenceMaxRound - round + 1);
    return `Round of ${playersInRound}`;
  };

  const getRoundName = (round: number): string => {
    if (tournamentType === "season_play") {
      if (round === 0) return "Regular Season";
      return describeEliminationRound(round, maxPlayoffRound);
    }
    return describeEliminationRound(round, maxRound);
  };
  
  // Check if a match is the 3rd place match
  const isThirdPlaceMatch = (match: Match): boolean => {
    if (tournamentType === "season_play") {
      return maxPlayoffRound > 0 && match.round > 0 && match.round === maxPlayoffRound && match.match_number === 2;
    }
    return match.round === maxRound && match.match_number === 2;
  };
  
  // Format match number with round prefix
  const formatMatchNumber = (match: Match): string => {
    if (isThirdPlaceMatch(match)) {
      return "3rd";
    }
    if (tournamentType === "season_play" && match.round === 0) {
      return `RS-${match.match_number}`;
    }
    return `R${match.round}-${match.match_number}`;
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-ntu-green mb-2">Matches & Results</h2>
          <p className="text-sm text-gray-600">
            💡 Click the <span className="font-semibold text-ntu-green">&quot;Edit&quot;</span> button on any match to update scores, winner, and court.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Round</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player 1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player 2</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No matches created yet.
                  </td>
                </tr>
              ) : (
                matches.map((match) => (
                  <tr key={match.id} className="hover:bg-gray-50">
                    {editingMatch === match.id ? (
                      // Edit mode
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {isThirdPlaceMatch(match) ? (
                            <span className="text-amber-600 font-semibold">🥉 3rd Place</span>
                          ) : (
                            getRoundName(match.round)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {formatMatchNumber(match)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{match.player1?.name || "TBD"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={editForm.score1}
                              onChange={(e) => setEditForm({ ...editForm, score1: e.target.value })}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                            <span className="py-1">-</span>
                            <input
                              type="text"
                              value={editForm.score2}
                              onChange={(e) => setEditForm({ ...editForm, score2: e.target.value })}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{match.player2?.name || "TBD"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={editForm.winner_id}
                            onChange={(e) => setEditForm({ ...editForm, winner_id: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">No winner</option>
                            {match.player1_id && <option value={match.player1_id}>{match.player1?.name}</option>}
                            {match.player2_id && <option value={match.player2_id}>{match.player2?.name}</option>}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={editForm.court}
                            onChange={(e) => setEditForm({ ...editForm, court: e.target.value })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Court"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="upcoming">Upcoming</option>
                            <option value="live">Live</option>
                            <option value="delayed">Delayed</option>
                            <option value="completed">Completed</option>
                            <option value="bye" disabled>
                              BYE (auto)
                            </option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleSave(match.id)} 
                            className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity mr-2 font-semibold"
                          >
                            ✓ Save
                          </button>
                          <button 
                            onClick={handleCancel} 
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                          >
                            ✕ Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      // View mode
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {isThirdPlaceMatch(match) ? (
                            <span className="text-amber-600 font-semibold">🥉 3rd Place</span>
                          ) : (
                            getRoundName(match.round)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {formatMatchNumber(match)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {match.player1?.seed && (
                            <span className="text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded mr-2">
                              {match.player1.seed}
                            </span>
                          )}
                          <span className="text-sm">{match.player1?.name || "TBD"}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {match.score1 && match.score2 ? `${match.score1} - ${match.score2}` : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {match.player2?.seed && (
                            <span className="text-xs font-bold text-white bg-ntu-green px-1.5 py-0.5 rounded mr-2">
                              {match.player2.seed}
                            </span>
                          )}
                          <span className="text-sm">{match.player2?.name || "TBD"}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {match.winner?.name || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{match.court || "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              match.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : match.status === 'live'
                                ? 'bg-red-100 text-red-800'
                                : match.status === 'delayed'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {match.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleEdit(match)} 
                            className="bg-ntu-green text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-semibold"
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

