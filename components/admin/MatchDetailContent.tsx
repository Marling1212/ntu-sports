"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { Player, SportStatDefinition, MatchPlayerStat, Event } from "@/types/database";
import Link from "next/link";

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
  slot_id?: string;
  status: string;
  player1?: Player;
  player2?: Player;
  winner?: Player;
}

interface SlotOption {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  code?: string;
  court_id?: string;
}

interface MatchDetailContentProps {
  eventId: string;
  match: Match;
  event: Event | null;
  players: Player[];
  teamMembers: Record<string, any[]>;
  statDefinitions: SportStatDefinition[];
  existingStats: MatchPlayerStat[];
  courts: Array<{ id: string; name: string }>;
  slots: SlotOption[];
}

const formatDateTimeDisplay = (iso?: string | null): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(date);
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
  const normalizeTime = (time?: string | null): string => {
    if (!time) return "00:00:00";
    const [hour = "00", minute = "00", second = "00"] = time.split(":");
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`;
  };
  const base = `${slot.slot_date}T${normalizeTime(slot.start_time)}`;
  if (base.includes("Z") || base.includes("+")) return base;
  return `${base}+08:00`;
};

export default function MatchDetailContent({
  eventId,
  match,
  event,
  players,
  teamMembers,
  statDefinitions,
  existingStats,
  courts,
  slots,
}: MatchDetailContentProps) {
  const [matchForm, setMatchForm] = useState({
    score1: match.score1 || "",
    score2: match.score2 || "",
    winner_id: match.winner_id || "",
    court: match.court || "",
    status: match.status || "upcoming",
    scheduled_time: toLocalInputValue(match.scheduled_time),
    slot_id: match.slot_id || "",
  });

  const [playerStats, setPlayerStats] = useState<Record<string, Record<string, string>>>({});
  const [teamMemberStats, setTeamMemberStats] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [customStats, setCustomStats] = useState<SportStatDefinition[]>([]);
  const [newCustomStat, setNewCustomStat] = useState({ name: "", label: "", type: "number" as const, level: "team" as const });
  const [selectedTeamMember, setSelectedTeamMember] = useState<Record<string, string>>({}); // { playerId: teamMemberId }
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  // Initialize player stats from existing stats
  useEffect(() => {
    const statsMap: Record<string, Record<string, string>> = {};
    const memberStatsMap: Record<string, Record<string, Record<string, string>>> = {};
    
    existingStats.forEach(stat => {
      if (stat.team_member_id) {
        // Player-level stat for team member
        if (!memberStatsMap[stat.player_id]) {
          memberStatsMap[stat.player_id] = {};
        }
        if (!memberStatsMap[stat.player_id][stat.team_member_id]) {
          memberStatsMap[stat.player_id][stat.team_member_id] = {};
        }
        memberStatsMap[stat.player_id][stat.team_member_id][stat.stat_name] = stat.stat_value || "";
      } else {
        // Team-level stat or player event stat
        if (!statsMap[stat.player_id]) {
          statsMap[stat.player_id] = {};
        }
        statsMap[stat.player_id][stat.stat_name] = stat.stat_value || "";
      }
    });
    
    setPlayerStats(statsMap);
    setTeamMemberStats(memberStatsMap);
  }, [existingStats]);

  // Separate default and custom stats
  useEffect(() => {
    const defaults = statDefinitions.filter(s => s.is_default);
    const customs = statDefinitions.filter(s => !s.is_default);
    setCustomStats(customs);
  }, [statDefinitions]);

  const handleSaveMatch = async () => {
    setSaving(true);
    try {
      const slotIdValue: string | null = matchForm.slot_id ? matchForm.slot_id : null;
      const selectedSlot = slotIdValue ? slots.find(s => s.id === slotIdValue) || null : null;
      let scheduledIso = toIsoString(matchForm.scheduled_time);
      if (!scheduledIso && selectedSlot) {
        scheduledIso = deriveIsoFromSlot(selectedSlot);
      }

      const { error } = await supabase
        .from("matches")
        .update({
          score1: matchForm.score1 || null,
          score2: matchForm.score2 || null,
          winner_id: matchForm.winner_id || null,
          court: matchForm.court || null,
          scheduled_time: scheduledIso,
          slot_id: slotIdValue,
          status: matchForm.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      if (error) throw error;

      toast.success("比賽資訊已保存！");
    } catch (error: any) {
      toast.error(`錯誤: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStats = async () => {
    setSaving(true);
    try {
      // Delete all existing stats for this match
      await supabase
        .from("match_player_stats")
        .delete()
        .eq("match_id", match.id);

      // Insert new stats
      const statsToInsert: any[] = [];
      
      // Team-level stats (or player event stats)
      Object.keys(playerStats).forEach(playerId => {
        Object.keys(playerStats[playerId]).forEach(statName => {
          const value = playerStats[playerId][statName];
          if (value !== undefined && value !== null && value !== "") {
            statsToInsert.push({
              match_id: match.id,
              player_id: playerId,
              stat_name: statName,
              stat_value: value,
              team_member_id: null, // Team-level stat
            });
          }
        });
      });

      // Player-level stats for team members
      Object.keys(teamMemberStats).forEach(playerId => {
        Object.keys(teamMemberStats[playerId]).forEach(teamMemberId => {
          Object.keys(teamMemberStats[playerId][teamMemberId]).forEach(statName => {
            const value = teamMemberStats[playerId][teamMemberId][statName];
            if (value !== undefined && value !== null && value !== "") {
              statsToInsert.push({
                match_id: match.id,
                player_id: playerId,
                team_member_id: teamMemberId,
                stat_name: statName,
                stat_value: value,
              });
            }
          });
        });
      });

      if (statsToInsert.length > 0) {
        const { error } = await supabase
          .from("match_player_stats")
          .insert(statsToInsert);

        if (error) throw error;
      }

      toast.success("統計數據已保存！");
    } catch (error: any) {
      toast.error(`錯誤: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomStat = async () => {
    if (!newCustomStat.name || !newCustomStat.label) {
      toast.error("請輸入統計項目名稱和標籤");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("sport_stat_definitions")
        .insert({
          sport: event?.sport || "",
          stat_name: newCustomStat.name,
          stat_label: newCustomStat.label,
          stat_type: newCustomStat.type,
          stat_level: newCustomStat.level,
          is_default: false,
          display_order: statDefinitions.length + customStats.length,
        })
        .select()
        .single();

      if (error) throw error;

      setCustomStats([...customStats, data]);
      setNewCustomStat({ name: "", label: "", type: "number", level: "team" });
      toast.success("自定義統計項目已添加！");
    } catch (error: any) {
      toast.error(`錯誤: ${error.message}`);
    }
  };

  const handleDeleteCustomStat = async (statId: string) => {
    if (!confirm("確定要刪除此自定義統計項目嗎？")) return;

    try {
      const { error } = await supabase
        .from("sport_stat_definitions")
        .delete()
        .eq("id", statId);

      if (error) throw error;

      setCustomStats(customStats.filter(s => s.id !== statId));
      toast.success("統計項目已刪除");
    } catch (error: any) {
      toast.error(`錯誤: ${error.message}`);
    }
  };

  const updatePlayerStat = (playerId: string, statName: string, value: string) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [statName]: value,
      },
    }));
  };

  const updateTeamMemberStat = (playerId: string, teamMemberId: string, statName: string, value: string) => {
    setTeamMemberStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [teamMemberId]: {
          ...prev[playerId]?.[teamMemberId],
          [statName]: value,
        },
      },
    }));
  };

  // Get list of team members who have data entered
  const getTeamMembersWithData = (playerId: string) => {
    if (!teamMembers[playerId]) return [];
    return teamMembers[playerId].filter((member: any) => {
      // Check if this member has any stats entered
      const memberStats = teamMemberStats[playerId]?.[member.id];
      if (!memberStats) return false;
      return Object.keys(memberStats).some(key => {
        const value = memberStats[key];
        return value !== undefined && value !== null && value !== "";
      });
    });
  };

  // Separate team-level and player-level stats
  const allStats = [...statDefinitions.filter(s => s.is_default), ...customStats].sort(
    (a, b) => a.display_order - b.display_order
  );
  
  const teamLevelStats = allStats.filter(s => s.stat_level === 'team' || !s.stat_level);
  const playerLevelStats = allStats.filter(s => s.stat_level === 'player');

  const player1 = match.player1_id ? players.find(p => p.id === match.player1_id) : null;
  const player2 = match.player2_id ? players.find(p => p.id === match.player2_id) : null;
  const isTeamEvent = event?.registration_type === 'team';

  // Calculate team-level stats from player-level stats (auto-sum)
  const calculateTeamStats = useMemo(() => {
    const teamStats: Record<string, Record<string, string>> = {};
    
    if (!isTeamEvent) return teamStats;
    
    // For each team (player1 and player2)
    [player1, player2].forEach(player => {
      if (!player || !teamMembers[player.id]) return;
      
      teamStats[player.id] = {};
      
      // For each team-level stat, sum up from player-level stats
      teamLevelStats.forEach(stat => {
        // Find corresponding player-level stat (e.g., 'goals' -> 'player_goals')
        const playerStatName = `player_${stat.stat_name}`;
        const playerStat = playerLevelStats.find(s => s.stat_name === playerStatName);
        
        if (playerStat && stat.stat_type === 'number') {
          // Sum up all player stats for this team
          let total = 0;
          teamMembers[player.id].forEach((member: any) => {
            const value = teamMemberStats[player.id]?.[member.id]?.[playerStatName];
            if (value) {
              total += parseFloat(value) || 0;
            }
          });
          teamStats[player.id][stat.stat_name] = total > 0 ? total.toString() : "";
        } else if (stat.stat_type === 'boolean') {
          // For boolean stats, check if any player has it set to true
          let hasTrue = false;
          teamMembers[player.id].forEach((member: any) => {
            const value = teamMemberStats[player.id]?.[member.id]?.[`player_${stat.stat_name}`];
            if (value === "true") {
              hasTrue = true;
            }
          });
          teamStats[player.id][stat.stat_name] = hasTrue ? "true" : "";
        }
      });
    });
    
    return teamStats;
  }, [teamMemberStats, teamMembers, teamLevelStats, playerLevelStats, isTeamEvent, player1, player2]);

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <Link 
          href={`/admin/${eventId}/matches`}
          className="text-ntu-green hover:underline mb-4 inline-block"
        >
          ← 返回比賽列表
        </Link>
        <h1 className="text-4xl font-bold text-ntu-green mb-2">
          比賽詳情
        </h1>
        <p className="text-lg text-gray-600">
          Round {match.round}, Match {match.match_number}
        </p>
      </div>

      {/* Match Basic Info */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">比賽基本信息</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isTeamEvent ? '隊伍 1' : '選手 1'}
            </label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              {player1 ? (
                <div>
                  <span className="font-semibold">{player1.name}</span>
                  {player1.department && (
                    <span className="text-gray-600 ml-2">({player1.department})</span>
                  )}
                  {player1.seed && (
                    <span className="ml-2 px-2 py-0.5 bg-ntu-green text-white text-xs rounded">
                      Seed {player1.seed}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">TBD</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isTeamEvent ? '隊伍 2' : '選手 2'}
            </label>
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              {player2 ? (
                <div>
                  <span className="font-semibold">{player2.name}</span>
                  {player2.department && (
                    <span className="text-gray-600 ml-2">({player2.department})</span>
                  )}
                  {player2.seed && (
                    <span className="ml-2 px-2 py-0.5 bg-ntu-green text-white text-xs rounded">
                      Seed {player2.seed}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">TBD</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">比分 1</label>
            <input
              type="text"
              value={matchForm.score1}
              onChange={(e) => setMatchForm({ ...matchForm, score1: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="比分"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">比分 2</label>
            <input
              type="text"
              value={matchForm.score2}
              onChange={(e) => setMatchForm({ ...matchForm, score2: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="比分"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">獲勝者</label>
            <select
              value={matchForm.winner_id}
              onChange={(e) => setMatchForm({ ...matchForm, winner_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="">無</option>
              {player1 && <option value={player1.id}>{player1.name}</option>}
              {player2 && <option value={player2.id}>{player2.name}</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">狀態</label>
            <select
              value={matchForm.status}
              onChange={(e) => setMatchForm({ ...matchForm, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="upcoming">即將開始</option>
              <option value="live">進行中</option>
              <option value="completed">已完成</option>
              <option value="delayed">延遲</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">場地</label>
            <input
              type="text"
              value={matchForm.court}
              onChange={(e) => setMatchForm({ ...matchForm, court: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="場地名稱"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">比賽時間</label>
            <input
              type="datetime-local"
              value={matchForm.scheduled_time}
              onChange={(e) => setMatchForm({ ...matchForm, scheduled_time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveMatch}
            disabled={saving}
            className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存比賽資訊"}
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      {allStats.length > 0 && (player1 || player2) && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-ntu-green">
              {isTeamEvent ? '隊伍統計' : '選手統計'}
            </h2>
            <button
              onClick={handleSaveStats}
              disabled={saving}
              className="bg-ntu-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存統計數據"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team/Player 1 */}
            {player1 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                  {player1.name}
                  {isTeamEvent && teamMembers[player1.id] && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({teamMembers[player1.id].length} 位球員)
                    </span>
                  )}
                </h3>

                {/* Player-level Stats for Team Members - MOVED TO TOP */}
                {isTeamEvent && playerLevelStats.length > 0 && teamMembers[player1.id] && teamMembers[player1.id].length > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-medium text-gray-700">個別球員統計</h4>
                      <select
                        value={selectedTeamMember[player1.id] || ""}
                        onChange={(e) => setSelectedTeamMember({ ...selectedTeamMember, [player1.id]: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
                      >
                        <option value="">選擇球員...</option>
                        {/* Show only players with data */}
                        {getTeamMembersWithData(player1.id).map((member: any) => (
                          <option key={member.id} value={member.id}>
                            {member.name}{member.jersey_number ? ` #${member.jersey_number}` : ''}
                          </option>
                        ))}
                        {/* Also show option to add new player */}
                        {teamMembers[player1.id].filter((m: any) => 
                          !getTeamMembersWithData(player1.id).some((d: any) => d.id === m.id)
                        ).map((member: any) => (
                          <option key={member.id} value={member.id}>
                            + {member.name}{member.jersey_number ? ` #${member.jersey_number}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {selectedTeamMember[player1.id] && (() => {
                      const member = teamMembers[player1.id].find((m: any) => m.id === selectedTeamMember[player1.id]);
                      if (!member) return null;
                      
                      return (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <h5 className="font-semibold text-gray-800 mb-3">
                            {member.name}
                            {member.jersey_number && (
                              <span className="text-sm text-gray-500 ml-2">#{member.jersey_number}</span>
                            )}
                          </h5>
                          <div className="space-y-3">
                            {playerLevelStats.map(stat => (
                              <div key={stat.id}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {stat.stat_label}
                                </label>
                                {stat.stat_type === 'number' ? (
                                  <input
                                    type="number"
                                    value={teamMemberStats[player1.id]?.[member.id]?.[stat.stat_name] || ""}
                                    onChange={(e) => updateTeamMemberStat(player1.id, member.id, stat.stat_name, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                                    placeholder="0"
                                  />
                                ) : stat.stat_type === 'boolean' ? (
                                  <select
                                    value={teamMemberStats[player1.id]?.[member.id]?.[stat.stat_name] || ""}
                                    onChange={(e) => updateTeamMemberStat(player1.id, member.id, stat.stat_name, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                                  >
                                    <option value="">—</option>
                                    <option value="true">是</option>
                                    <option value="false">否</option>
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={teamMemberStats[player1.id]?.[member.id]?.[stat.stat_name] || ""}
                                    onChange={(e) => updateTeamMemberStat(player1.id, member.id, stat.stat_name, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                                    placeholder="輸入文字"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* For non-team events, show all stats */}
                {!isTeamEvent && (
                  <div className="space-y-3">
                    {allStats.map(stat => (
                      <div key={stat.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {stat.stat_label}
                        </label>
                        {stat.stat_type === 'number' ? (
                          <input
                            type="number"
                            value={playerStats[player1.id]?.[stat.stat_name] || ""}
                            onChange={(e) => updatePlayerStat(player1.id, stat.stat_name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                            placeholder="0"
                          />
                        ) : stat.stat_type === 'boolean' ? (
                          <select
                            value={playerStats[player1.id]?.[stat.stat_name] || ""}
                            onChange={(e) => updatePlayerStat(player1.id, stat.stat_name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                          >
                            <option value="">—</option>
                            <option value="true">是</option>
                            <option value="false">否</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={playerStats[player1.id]?.[stat.stat_name] || ""}
                            onChange={(e) => updatePlayerStat(player1.id, stat.stat_name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                            placeholder="輸入文字"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Team/Player 2 */}
            {player2 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                  {player2.name}
                  {isTeamEvent && teamMembers[player2.id] && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({teamMembers[player2.id].length} 位球員)
                    </span>
                  )}
                </h3>

                {/* Player-level Stats for Team Members - MOVED TO TOP */}
                {isTeamEvent && playerLevelStats.length > 0 && teamMembers[player2.id] && teamMembers[player2.id].length > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-medium text-gray-700">個別球員統計</h4>
                      <select
                        value={selectedTeamMember[player2.id] || ""}
                        onChange={(e) => setSelectedTeamMember({ ...selectedTeamMember, [player2.id]: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
                      >
                        <option value="">選擇球員...</option>
                        {/* Show only players with data */}
                        {getTeamMembersWithData(player2.id).map((member: any) => (
                          <option key={member.id} value={member.id}>
                            {member.name}{member.jersey_number ? ` #${member.jersey_number}` : ''}
                          </option>
                        ))}
                        {/* Also show option to add new player */}
                        {teamMembers[player2.id].filter((m: any) => 
                          !getTeamMembersWithData(player2.id).some((d: any) => d.id === m.id)
                        ).map((member: any) => (
                          <option key={member.id} value={member.id}>
                            + {member.name}{member.jersey_number ? ` #${member.jersey_number}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {selectedTeamMember[player2.id] && (() => {
                      const member = teamMembers[player2.id].find((m: any) => m.id === selectedTeamMember[player2.id]);
                      if (!member) return null;
                      
                      return (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <h5 className="font-semibold text-gray-800 mb-3">
                            {member.name}
                            {member.jersey_number && (
                              <span className="text-sm text-gray-500 ml-2">#{member.jersey_number}</span>
                            )}
                          </h5>
                          <div className="space-y-3">
                            {playerLevelStats.map(stat => (
                              <div key={stat.id}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {stat.stat_label}
                                </label>
                                {stat.stat_type === 'number' ? (
                                  <input
                                    type="number"
                                    value={teamMemberStats[player2.id]?.[member.id]?.[stat.stat_name] || ""}
                                    onChange={(e) => updateTeamMemberStat(player2.id, member.id, stat.stat_name, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                                    placeholder="0"
                                  />
                                ) : stat.stat_type === 'boolean' ? (
                                  <select
                                    value={teamMemberStats[player2.id]?.[member.id]?.[stat.stat_name] || ""}
                                    onChange={(e) => updateTeamMemberStat(player2.id, member.id, stat.stat_name, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                                  >
                                    <option value="">—</option>
                                    <option value="true">是</option>
                                    <option value="false">否</option>
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={teamMemberStats[player2.id]?.[member.id]?.[stat.stat_name] || ""}
                                    onChange={(e) => updateTeamMemberStat(player2.id, member.id, stat.stat_name, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                                    placeholder="輸入文字"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Team-level Stats - READ ONLY, AUTO CALCULATED */}
                {isTeamEvent && teamLevelStats.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">隊伍整體統計（自動計算）</h4>
                    <div className="space-y-3">
                      {teamLevelStats.map(stat => {
                        // Find corresponding player-level stat
                        const playerStatName = `player_${stat.stat_name}`;
                        const playerStat = playerLevelStats.find(s => s.stat_name === playerStatName);
                        const calculatedValue = calculateTeamStats[player2.id]?.[stat.stat_name] || "";
                        
                        return (
                          <div key={stat.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {stat.stat_label}
                            </label>
                            {stat.stat_type === 'number' ? (
                              <input
                                type="number"
                                value={calculatedValue}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                                placeholder="0"
                              />
                            ) : stat.stat_type === 'boolean' ? (
                              <input
                                type="text"
                                value={calculatedValue ? (calculatedValue === "true" ? "是" : "否") : "—"}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                              />
                            ) : (
                              <input
                                type="text"
                                value={calculatedValue}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                                placeholder="自動計算"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* For non-team events, show all stats */}
                {!isTeamEvent && (
                  <div className="space-y-3">
                    {allStats.map(stat => (
                      <div key={stat.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {stat.stat_label}
                        </label>
                        {stat.stat_type === 'number' ? (
                          <input
                            type="number"
                            value={playerStats[player2.id]?.[stat.stat_name] || ""}
                            onChange={(e) => updatePlayerStat(player2.id, stat.stat_name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                            placeholder="0"
                          />
                        ) : stat.stat_type === 'boolean' ? (
                          <select
                            value={playerStats[player2.id]?.[stat.stat_name] || ""}
                            onChange={(e) => updatePlayerStat(player2.id, stat.stat_name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                          >
                            <option value="">—</option>
                            <option value="true">是</option>
                            <option value="false">否</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={playerStats[player2.id]?.[stat.stat_name] || ""}
                            onChange={(e) => updatePlayerStat(player2.id, stat.stat_name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                            placeholder="輸入文字"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Stats Management */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-2xl font-semibold text-ntu-green mb-4">自定義統計項目</h2>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className={`grid grid-cols-1 md:grid-cols-${isTeamEvent ? '5' : '4'} gap-3`}>
            <input
              type="text"
              placeholder="統計名稱（英文，如：custom_stat）"
              value={newCustomStat.name}
              onChange={(e) => setNewCustomStat({ ...newCustomStat, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            />
            <input
              type="text"
              placeholder="顯示標籤（如：自定義統計）"
              value={newCustomStat.label}
              onChange={(e) => setNewCustomStat({ ...newCustomStat, label: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            />
            <select
              value={newCustomStat.type}
              onChange={(e) => setNewCustomStat({ ...newCustomStat, type: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
            >
              <option value="number">數字</option>
              <option value="text">文字</option>
              <option value="boolean">是/否</option>
            </select>
            {isTeamEvent && (
              <select
                value={newCustomStat.level}
                onChange={(e) => setNewCustomStat({ ...newCustomStat, level: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              >
                <option value="team">隊伍層級</option>
                <option value="player">球員層級</option>
              </select>
            )}
            <button
              onClick={handleAddCustomStat}
              className="bg-ntu-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              添加
            </button>
          </div>
        </div>

        {customStats.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700 mb-2">已添加的自定義項目：</h3>
            {customStats.map(stat => (
              <div key={stat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{stat.stat_label}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({stat.stat_name} - {stat.stat_type === 'number' ? '數字' : stat.stat_type === 'text' ? '文字' : '是/否'}
                    {isTeamEvent && ` - ${stat.stat_level === 'team' ? '隊伍層級' : '球員層級'}`})
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteCustomStat(stat.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  刪除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

