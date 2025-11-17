"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { Player } from "@/types/database";
import { checkAndAnnounceRoundCompletion } from "@/lib/utils/checkRoundCompletion";

interface SlotOption {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  code?: string | null;
  court_id?: string | null;
}

const taipeiFormatter = new Intl.DateTimeFormat("zh-TW", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Taipei",
});

const normalizeTime = (time?: string | null): string => {
  if (!time) return "";
  const [hour = "00", minute = "00"] = time.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
};

const normalizeTimeWithSeconds = (time?: string | null): string => {
  if (!time) return "00:00:00";
  const [hour = "00", minute = "00", second = "00"] = time.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`;
};

const formatSlotScheduleRange = (slot: SlotOption): string => {
  const start = normalizeTime(slot.start_time);
  const end = normalizeTime(slot.end_time);
  const range = end ? `${start}-${end}` : start;
  return `${slot.slot_date} ${range}`;
};

const formatSlotLabel = (slot: SlotOption): string => {
  const base = formatSlotScheduleRange(slot);
  return slot.code ? `${slot.code} · ${base}` : base;
};

const formatDateTimeDisplay = (iso?: string | null): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return taipeiFormatter.format(date);
};

const toLocalInputValue = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const toIsoString = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const deriveIsoFromSlot = (slot?: SlotOption | null): string | null => {
  if (!slot) return null;
  const base = `${slot.slot_date}T${normalizeTimeWithSeconds(slot.start_time)}`;
  if (base.includes("Z") || base.includes("+")) return base;
  return `${base}+08:00`;
};

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
  scheduled_time?: string | null;
  slot_id?: string | null;
  slot?: SlotOption | null;
  status: string;
  player1?: Player;
  player2?: Player;
  winner?: Player;
}

interface MatchesTableProps {
  eventId: string;
  initialMatches: Match[];
  players: Player[];
  slots?: SlotOption[];
  courts?: Array<{ id: string; name: string }>;
  tournamentType?: "single_elimination" | "season_play" | null;
}

export default function MatchesTable({
  eventId,
  initialMatches,
  players,
  slots = [],
  courts = [],
  tournamentType,
}: MatchesTableProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const supabase = createClient();
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courtFilter, setCourtFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [roundFilter, setRoundFilter] = useState<string>("all");
  
  // Batch operation states
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchOperation, setBatchOperation] = useState<"score" | "court" | "status" | null>(null);
  const [batchForm, setBatchForm] = useState({ court: "", status: "", customCourt: "" });

  const slotMap = useMemo(() => {
    const map = new Map<string, SlotOption>();
    slots.forEach((slot) => map.set(slot.id, slot));
    return map;
  }, [slots]);

  // Filter matches based on search and filters
  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      // Search query filter (player names)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const player1Name = match.player1?.name?.toLowerCase() || "";
        const player2Name = match.player2?.name?.toLowerCase() || "";
        const winnerName = match.winner?.name?.toLowerCase() || "";
        if (!player1Name.includes(query) && !player2Name.includes(query) && !winnerName.includes(query)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && match.status !== statusFilter) {
        return false;
      }

      // Court filter
      if (courtFilter !== "all") {
        if (courtFilter === "none" && match.court) return false;
        if (courtFilter !== "none" && match.court !== courtFilter) return false;
      }

      // Date filter
      if (dateFilter) {
        const matchDate = match.scheduled_time ? new Date(match.scheduled_time).toISOString().split("T")[0] : null;
        if (matchDate !== dateFilter) return false;
      }

      // Round filter
      if (roundFilter !== "all") {
        if (roundFilter === "regular" && match.round !== 0) return false;
        if (roundFilter === "playoffs" && match.round === 0) return false;
        if (roundFilter !== "regular" && roundFilter !== "playoffs" && match.round.toString() !== roundFilter) {
          return false;
        }
      }

      return true;
    });
  }, [matches, searchQuery, statusFilter, courtFilter, dateFilter, roundFilter]);

  const handleEdit = (match: Match) => {
    const slotCandidate = match.slot_id ? slotMap.get(match.slot_id) || match.slot || null : match.slot || null;
    const scheduledSource = match.scheduled_time || deriveIsoFromSlot(slotCandidate);
    setEditingMatch(match.id);
    setEditForm({
      score1: match.score1 || "",
      score2: match.score2 || "",
      winner_id: match.winner_id || "",
      court: match.court || "",
      status: match.status || "upcoming",
      scheduled_time: toLocalInputValue(scheduledSource),
      slot_id: match.slot_id || "",
    });
  };

  const handleSave = async (matchId: string) => {
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;

    // Check if status changed to "live"
    const isNowLive = editForm.status === "live" && currentMatch.status !== "live";

    const slotIdValue: string | null = editForm.slot_id ? editForm.slot_id : null;
    const selectedSlot = slotIdValue ? slotMap.get(slotIdValue) || null : null;
    let scheduledIso = toIsoString(editForm.scheduled_time);
    if (!scheduledIso && selectedSlot) {
      scheduledIso = deriveIsoFromSlot(selectedSlot);
    }

    // Update current match
    const { data, error } = await supabase
      .from("matches")
      .update({
        score1: editForm.score1 || null,
        score2: editForm.score2 || null,
        winner_id: editForm.winner_id || null,
        court: editForm.court || null,
        scheduled_time: scheduledIso,
        slot_id: slotIdValue,
        status: editForm.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select(`
        *,
        player1:players!matches_player1_id_fkey(id, name, seed),
        player2:players!matches_player2_id_fkey(id, name, seed),
        winner:players!matches_winner_id_fkey(id, name, seed),
        slot:event_slots(id, slot_date, start_time, end_time, code, court_id)
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

  // Batch operations
  const toggleMatchSelection = (matchId: string) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(matchId)) {
      newSelected.delete(matchId);
    } else {
      newSelected.add(matchId);
    }
    setSelectedMatches(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedMatches.size === filteredMatches.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(filteredMatches.map(m => m.id)));
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedMatches.size === 0) {
      toast.error("請選擇至少一場比賽");
      return;
    }

    if (batchOperation === "court") {
      const courtValue = batchForm.court === "OTHER" ? batchForm.customCourt : batchForm.court;
      if (!courtValue) {
        toast.error("請選擇或輸入場地");
        return;
      }
    }

    if (batchOperation === "status" && !batchForm.status) {
      toast.error("請選擇狀態");
      return;
    }

    const updates: any[] = [];
    for (const matchId of selectedMatches) {
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (batchOperation === "court") {
        updateData.court = batchForm.court === "OTHER" ? batchForm.customCourt : batchForm.court;
      }
      
      if (batchOperation === "status") {
        updateData.status = batchForm.status;
      }

      updates.push(
        supabase
          .from("matches")
          .update(updateData)
          .eq("id", matchId)
      );
    }

    try {
      await Promise.all(updates);
      toast.success(`成功更新 ${selectedMatches.size} 場比賽`);
      
      // Refresh matches
      const { data: updatedMatches } = await supabase
        .from("matches")
        .select(`
          *,
          player1:players!matches_player1_id_fkey(id, name, seed),
          player2:players!matches_player2_id_fkey(id, name, seed),
          winner:players!matches_winner_id_fkey(id, name, seed),
          slot:event_slots(id, slot_date, start_time, end_time, code, court_id)
        `)
        .eq("event_id", eventId)
        .order("round", { ascending: true })
        .order("match_number", { ascending: true });

      if (updatedMatches) {
        setMatches(updatedMatches);
      }
      
      setSelectedMatches(new Set());
      setBatchMode(false);
      setBatchOperation(null);
      setBatchForm({ court: "", status: "", customCourt: "" });
    } catch (error: any) {
      toast.error(`更新失敗: ${error.message}`);
    }
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
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-ntu-green mb-2">Matches & Results</h2>
              <p className="text-sm text-gray-600">
                💡 Click the <span className="font-semibold text-ntu-green">&quot;Edit&quot;</span> button on any match to update scores, winner, and court.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              顯示 {filteredMatches.length} / {matches.length} 場比賽
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="搜尋選手名稱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
              >
                <option value="all">所有狀態</option>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>

            {/* Court Filter */}
            <div>
              <select
                value={courtFilter}
                onChange={(e) => setCourtFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
              >
                <option value="all">所有場地</option>
                <option value="none">未分配</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.name}>
                    {court.name}
                  </option>
                ))}
                {Array.from(new Set(matches.map(m => m.court).filter(Boolean))).filter(c => !courts.some(ec => ec.name === c)).map((court) => (
                  <option key={court} value={court}>
                    {court}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
              />
            </div>
          </div>

          {/* Round Filter (for season play) */}
          {tournamentType === "season_play" && (
            <div className="mt-4">
              <select
                value={roundFilter}
                onChange={(e) => setRoundFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
              >
                <option value="all">所有輪次</option>
                <option value="regular">常規賽</option>
                <option value="playoffs">季後賽</option>
                {Array.from(new Set(matches.filter(m => m.round > 0).map(m => m.round))).sort((a, b) => a - b).map((round) => (
                  <option key={round} value={round.toString()}>
                    {describeEliminationRound(round, maxPlayoffRound)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {(searchQuery || statusFilter !== "all" || courtFilter !== "all" || dateFilter || roundFilter !== "all") && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCourtFilter("all");
                  setDateFilter("");
                  setRoundFilter("all");
                }}
                className="text-sm text-ntu-green hover:underline"
              >
                ✕ 清除所有篩選
              </button>
            </div>
          )}

          {/* Batch Operations */}
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={() => {
                setBatchMode(!batchMode);
                if (batchMode) {
                  setSelectedMatches(new Set());
                  setBatchOperation(null);
                  setBatchForm({ court: "", status: "", customCourt: "" });
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                batchMode
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {batchMode ? "✕ 取消批量操作" : "📋 批量操作"}
            </button>
            
            {batchMode && selectedMatches.size > 0 && (
              <span className="text-sm text-gray-600">
                已選擇 {selectedMatches.size} 場比賽
              </span>
            )}
          </div>

          {/* Batch Operation Controls */}
          {batchMode && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">操作類型</label>
                  <select
                    value={batchOperation || ""}
                    onChange={(e) => setBatchOperation(e.target.value as "score" | "court" | "status" | null)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">選擇操作...</option>
                    <option value="court">批量分配場地</option>
                    <option value="status">批量更新狀態</option>
                  </select>
                </div>

                {batchOperation === "court" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">場地</label>
                    <select
                      value={batchForm.court}
                      onChange={(e) => setBatchForm({ ...batchForm, court: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">選擇場地...</option>
                      {courts.map((court) => (
                        <option key={court.id} value={court.name}>{court.name}</option>
                      ))}
                      <option value="OTHER">其他（手動輸入）</option>
                    </select>
                    {batchForm.court === "OTHER" && (
                      <input
                        type="text"
                        placeholder="輸入場地名稱"
                        value={batchForm.customCourt}
                        onChange={(e) => setBatchForm({ ...batchForm, customCourt: e.target.value })}
                        className="mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm w-full"
                      />
                    )}
                  </div>
                )}

                {batchOperation === "status" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">狀態</label>
                    <select
                      value={batchForm.status}
                      onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">選擇狀態...</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>
                )}

                {batchOperation && (
                  <button
                    onClick={handleBatchUpdate}
                    disabled={selectedMatches.size === 0}
                    className="px-4 py-2 bg-ntu-green text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    執行批量更新 ({selectedMatches.size})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {batchMode && (
                  <th className="px-6 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedMatches.size === filteredMatches.length && filteredMatches.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-ntu-green focus:ring-ntu-green"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Round</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player 1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player 2</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Court</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={batchMode ? 11 : 10} className="px-6 py-12 text-center text-gray-500">
                    {matches.length === 0 
                      ? "No matches created yet."
                      : "No matches match your filters. Try adjusting your search criteria."}
                  </td>
                </tr>
              ) : (
                filteredMatches.map((match) => (
                  <tr key={match.id} className={`hover:bg-gray-50 ${selectedMatches.has(match.id) ? 'bg-blue-50' : ''}`}>
                    {batchMode && (
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedMatches.has(match.id)}
                          onChange={() => toggleMatchSelection(match.id)}
                          className="rounded border-gray-300 text-ntu-green focus:ring-ntu-green"
                        />
                      </td>
                    )}
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
                          <div className="flex flex-col gap-2">
                            <input
                              type="datetime-local"
                              value={editForm.scheduled_time || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  scheduled_time: e.target.value,
                                  slot_id: "",
                                })
                              }
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            {slots.length > 0 && (
                              <select
                                value={editForm.slot_id || ""}
                                onChange={(e) => {
                                  const newSlotId = e.target.value;
                                  if (!newSlotId) {
                                    setEditForm({
                                      ...editForm,
                                      slot_id: "",
                                    });
                                    return;
                                  }
                                  const slot = slotMap.get(newSlotId) || null;
                                  setEditForm({
                                    ...editForm,
                                    slot_id: newSlotId,
                                    scheduled_time: toLocalInputValue(deriveIsoFromSlot(slot)),
                                  });
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">選擇時段代號</option>
                                {slots.map((slot) => (
                                  <option key={slot.id} value={slot.id}>
                                    {formatSlotLabel(slot)}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            <select
                              value={
                                editForm.court && courts.find((c: any) => c.name === editForm.court)
                                  ? courts.find((c: any) => c.name === editForm.court)!.id
                                  : editForm.court === "" ? "" : "OTHER"
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  setEditForm({ ...editForm, court: "" });
                                } else if (val === "OTHER") {
                                  // leave court as-is for manual input
                                  if (!editForm.court) setEditForm({ ...editForm, court: "" });
                                } else {
                                  const selected = courts.find((c: any) => c.id === val);
                                  setEditForm({ ...editForm, court: selected?.name || "" });
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">選擇場地</option>
                              {courts.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                              <option value="OTHER">其他（手動輸入）</option>
                            </select>
                            <input
                              type="text"
                              value={editForm.court}
                              onChange={(e) => setEditForm({ ...editForm, court: e.target.value })}
                              className="w-40 px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Court"
                            />
                          </div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {match.slot ? (
                            <div className="flex flex-col">
                              {match.slot.code && (
                                <span className="text-sm font-semibold text-ntu-green">
                                  {match.slot.code}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatSlotScheduleRange(match.slot)}
                              </span>
                            </div>
                          ) : match.scheduled_time ? (
                            <span className="text-sm text-gray-700">
                              {formatDateTimeDisplay(match.scheduled_time)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">未排定</span>
                          )}
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

