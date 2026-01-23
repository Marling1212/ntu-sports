"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Player, Event } from "@/types/database";

interface ManualBracketEditorProps {
  eventId: string;
  players: Player[];
}

interface BracketPosition {
  position: number; // 0-based position in bracket
  player: Player | null;
}

export default function ManualBracketEditor({ eventId, players }: ManualBracketEditorProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState(true);
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Calculate bracket size (next power of 2)
  const bracketSize = useMemo(() => {
    if (players.length < 2) return 0;
    return Math.pow(2, Math.ceil(Math.log2(players.length)));
  }, [players.length]);

  const numRounds = useMemo(() => {
    if (bracketSize === 0) return 0;
    return Math.log2(bracketSize);
  }, [bracketSize]);

  const numByes = useMemo(() => {
    return bracketSize - players.length;
  }, [bracketSize, players.length]);

  // Initialize bracket positions
  const [bracketPositions, setBracketPositions] = useState<BracketPosition[]>(() => {
    return Array.from({ length: bracketSize }, (_, i) => ({
      position: i,
      player: null,
    }));
  });

  // Load event info and existing matches
  useEffect(() => {
    const loadEventAndMatches = async () => {
      setLoadingExisting(true);
      
      // Load event info
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();
      
      if (eventData) {
        setEvent(eventData);
        setIsLocked(eventData.bracket_locked || false);
      }

      // Load existing matches
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .eq("event_id", eventId)
        .order("round", { ascending: true })
        .order("match_number", { ascending: true });

      if (matches && matches.length > 0) {
        // Load Round 1 matches into bracket positions
        const round1Matches = matches.filter(m => m.round === 1);
        const newPositions = Array.from({ length: bracketSize }, (_, i) => ({
          position: i,
          player: null,
        }));

        round1Matches.forEach((match) => {
          const matchIndex = match.match_number - 1;
          const pos1Index = matchIndex * 2;
          const pos2Index = matchIndex * 2 + 1;

          if (match.player1_id) {
            const player1 = players.find(p => p.id === match.player1_id);
            if (player1 && pos1Index < newPositions.length) {
              const position: BracketPosition = { 
                position: pos1Index, 
                player: player1
              };
              newPositions[pos1Index] = position;
            }
          }
          if (match.player2_id) {
            const player2 = players.find(p => p.id === match.player2_id);
            if (player2 && pos2Index < newPositions.length) {
              const position: BracketPosition = { 
                position: pos2Index, 
                player: player2
              };
              newPositions[pos2Index] = position;
            }
          }
        });

        setBracketPositions(newPositions);
        toast.success(`已載入現有籤表（${round1Matches.length} 場第一輪比賽）`);
      }
      
      setLoadingExisting(false);
    };

    if (eventId && bracketSize > 0) {
      loadEventAndMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, bracketSize]);

  // Get unassigned players
  const unassignedPlayers = useMemo(() => {
    const assignedPlayerIds = new Set(
      bracketPositions
        .filter((pos) => pos.player !== null)
        .map((pos) => pos.player!.id)
    );
    return players.filter((p) => !assignedPlayerIds.has(p.id));
  }, [bracketPositions, players]);

  // Get assigned players with their positions
  const assignedPlayers = useMemo(() => {
    return bracketPositions
      .filter((pos) => pos.player !== null)
      .map((pos) => ({
        player: pos.player!,
        position: pos.position,
      }));
  }, [bracketPositions]);

  // Handle drag start
  const handleDragStart = (player: Player) => {
    setDraggedPlayer(player);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, positionIndex: number) => {
    e.preventDefault();
    setDragOverPosition(positionIndex);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  // Handle drop
  const handleDrop = (positionIndex: number) => {
    if (!draggedPlayer || isLocked) {
      if (isLocked) {
        toast.error("籤表已鎖定，請先解鎖才能編輯");
      }
      return;
    }

    setBracketPositions((prev) => {
      const newPositions = [...prev];
      // Remove player from old position if exists
      const oldIndex = newPositions.findIndex(
        (pos) => pos.player?.id === draggedPlayer.id
      );
      if (oldIndex !== -1) {
        newPositions[oldIndex] = { ...newPositions[oldIndex], player: null };
      }
      // Place player in new position
      newPositions[positionIndex] = {
        ...newPositions[positionIndex],
        player: draggedPlayer,
      };
      return newPositions;
    });

    setDraggedPlayer(null);
    setDragOverPosition(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedPlayer(null);
    setDragOverPosition(null);
  };

  // Handle click to select player for position
  const handlePositionClick = (positionIndex: number) => {
    setSelectedPosition(positionIndex);
  };

  // Handle player selection from dropdown
  const handlePlayerSelect = (playerId: string) => {
    if (selectedPosition === null) return;
    if (isLocked) {
      toast.error("籤表已鎖定，請先解鎖才能編輯");
      setSelectedPosition(null);
      return;
    }

    const player = players.find((p) => p.id === playerId);
    if (!player) return;

    setBracketPositions((prev) => {
      const newPositions = [...prev];
      // Remove player from old position if exists
      const oldIndex = newPositions.findIndex(
        (pos) => pos.player?.id === playerId
      );
      if (oldIndex !== -1) {
        newPositions[oldIndex] = { ...newPositions[oldIndex], player: null };
      }
      // Place player in new position
      newPositions[selectedPosition] = {
        ...newPositions[selectedPosition],
        player: player,
      };
      return newPositions;
    });

    setSelectedPosition(null);
  };

  // Remove player from position
  const handleRemovePlayer = (positionIndex: number) => {
    if (isLocked) {
      toast.error("籤表已鎖定，請先解鎖才能編輯");
      return;
    }
    setBracketPositions((prev) => {
      const newPositions = [...prev];
      newPositions[positionIndex] = { ...newPositions[positionIndex], player: null };
      return newPositions;
    });
  };

  // Clear all positions
  const handleClearAll = () => {
    if (isLocked) {
      toast.error("籤表已鎖定，請先解鎖才能編輯");
      return;
    }
    if (!confirm("確定要清除所有已分配的選手嗎？")) return;
    setBracketPositions(
      Array.from({ length: bracketSize }, (_, i) => ({
        position: i,
        player: null,
      }))
    );
  };

  // Auto-fill remaining positions with unassigned players
  const handleAutoFill = () => {
    if (isLocked) {
      toast.error("籤表已鎖定，請先解鎖才能編輯");
      return;
    }
    const remaining = [...unassignedPlayers];
    if (remaining.length === 0) {
      toast.success("所有選手都已分配完成！");
      return;
    }

    setBracketPositions((prev) => {
      const newPositions = [...prev];
      let remainingIndex = 0;
      for (let i = 0; i < newPositions.length && remainingIndex < remaining.length; i++) {
        if (newPositions[i].player === null) {
          newPositions[i] = {
            ...newPositions[i],
            player: remaining[remainingIndex++],
          };
        }
      }
      return newPositions;
    });

    toast.success(`已自動分配 ${Math.min(remaining.length, bracketSize - players.length + remaining.length)} 位選手`);
  };

  // Handle unlock
  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      toast.error("請填寫解鎖原因");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("無法取得使用者資訊");
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({ bracket_locked: false })
      .eq("id", eventId);

    if (error) {
      toast.error(`解鎖失敗: ${error.message}`);
      return;
    }

    // Record unlock in history
    await supabase
      .from("bracket_edit_history")
      .insert({
        event_id: eventId,
        admin_id: user.id,
        action: 'unlock',
        reason: unlockReason.trim(),
      });

    setIsLocked(false);
    setShowUnlockModal(false);
    setUnlockReason("");
    toast.success("籤表已解鎖，現在可以編輯");
  };

  // Handle lock
  const handleLock = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("無法取得使用者資訊");
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({ bracket_locked: true })
      .eq("id", eventId);

    if (error) {
      toast.error(`鎖定失敗: ${error.message}`);
      return;
    }

    // Record lock in history
    await supabase
      .from("bracket_edit_history")
      .insert({
        event_id: eventId,
        admin_id: user.id,
        action: 'lock',
        reason: '手動鎖定籤表',
      });

    setIsLocked(true);
    toast.success("籤表已鎖定");
  };

  // Save bracket to database
  const handleSave = async () => {
    if (players.length < 2) {
      toast.error("至少需要2位選手才能生成籤表！");
      return;
    }

    // Validate: no BYE vs BYE
    for (let i = 0; i < bracketSize; i += 2) {
      const pos1 = bracketPositions[i];
      const pos2 = bracketPositions[i + 1];
      if (!pos1.player && !pos2.player) {
        toast.error(`位置 ${i + 1} 和 ${i + 2} 都是空的（BYE vs BYE），請至少分配一位選手！`);
        return;
      }
    }

    setLoading(true);

    try {
      // Get current user for history tracking
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("無法取得使用者資訊");
        setLoading(false);
        return;
      }

      // Check for existing matches
      const { count } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      if (count && count > 0) {
        const confirmDelete = window.confirm(
          "已有比賽存在。是否要刪除現有比賽並重新生成？"
        );
        if (!confirmDelete) {
          setLoading(false);
          return;
        }

        // Delete existing matches
        await supabase.from("matches").delete().eq("event_id", eventId);
        
        // Record deletion in history
        await supabase
          .from("bracket_edit_history")
          .insert({
            event_id: eventId,
            admin_id: user.id,
            action: 'edit',
            changes: { action: 'delete_all_matches' },
            reason: '刪除現有比賽以重新生成',
          });
      }

      // Generate matches
      const matches = [];
      const round2Advances: Map<string, string> = new Map();
      let matchesInRound = bracketSize / 2;

      for (let round = 1; round <= numRounds; round++) {
        for (let i = 0; i < matchesInRound; i++) {
          if (round === 1) {
            const positionIndex = i * 2;
            const pos1 = bracketPositions[positionIndex];
            const pos2 = bracketPositions[positionIndex + 1];
            const matchNum = i + 1;

            const player1 = pos1.player;
            const player2 = pos2.player;

            const nextRoundMatch = Math.ceil(matchNum / 2);
            const feedsPlayer1 = matchNum % 2 === 1;
            const slotKey = `${nextRoundMatch}-${feedsPlayer1 ? "1" : "2"}`;

            if (player1 && !player2) {
              round2Advances.set(slotKey, player1.id);
              matches.push({
                event_id: eventId,
                round: round,
                match_number: matchNum,
                player1_id: player1.id,
                player2_id: null,
                winner_id: player1.id,
                status: "bye",
              });
            } else if (!player1 && player2) {
              round2Advances.set(slotKey, player2.id);
              matches.push({
                event_id: eventId,
                round: round,
                match_number: matchNum,
                player1_id: null,
                player2_id: player2.id,
                winner_id: player2.id,
                status: "bye",
              });
            } else if (!player1 && !player2) {
              matches.push({
                event_id: eventId,
                round: round,
                match_number: matchNum,
                player1_id: null,
                player2_id: null,
                status: "bye",
              });
            } else if (player1 && player2) {
              matches.push({
                event_id: eventId,
                round: round,
                match_number: matchNum,
                player1_id: player1.id,
                player2_id: player2.id,
                status: "upcoming",
              });
            }
          } else if (round === 2) {
            const matchNum = i + 1;
            const player1Key = `${matchNum}-1`;
            const player2Key = `${matchNum}-2`;
            const player1Id = round2Advances.get(player1Key) || null;
            const player2Id = round2Advances.get(player2Key) || null;

            matches.push({
              event_id: eventId,
              round: round,
              match_number: matchNum,
              player1_id: player1Id,
              player2_id: player2Id,
              status: "upcoming",
            });
          } else {
            matches.push({
              event_id: eventId,
              round: round,
              match_number: i + 1,
              status: "upcoming",
            });
          }
        }
        matchesInRound = matchesInRound / 2;
      }

      // Insert all matches
      const { error: insertError } = await supabase
        .from("matches")
        .insert(matches);

      if (insertError) {
        throw insertError;
      }

      // Update event with bracket generation method
      await supabase
        .from("events")
        .update({
          bracket_generation_method: 'manual',
          bracket_generated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      // Record save in history
      await supabase
        .from("bracket_edit_history")
        .insert({
          event_id: eventId,
          admin_id: user.id,
          action: 'save',
          changes: {
            method: 'manual',
            matches_created: matches.length,
            bracket_size: bracketSize,
            rounds: numRounds,
          },
          reason: '手動分配並儲存籤表',
        });

      // Create 3rd place match if enabled
      if (hasThirdPlaceMatch && numRounds >= 2) {
        const thirdPlaceMatch = {
          event_id: eventId,
          round: numRounds,
          match_number: 2,
          player1_id: null,
          player2_id: null,
          status: "upcoming" as const,
        };

        await supabase.from("matches").insert(thirdPlaceMatch);

        await supabase
          .from("events")
          .update({ has_third_place_match: true })
          .eq("id", eventId);
      }

      toast.success(`成功生成 ${matches.length} 場比賽！${hasThirdPlaceMatch ? "（含季軍賽）" : ""}`);
      
      // Refresh page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(`儲存失敗：${error?.message || "請稍後再試"}`);
    } finally {
      setLoading(false);
    }
  };

  if (players.length < 2) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h3 className="text-xl font-semibold text-ntu-green mb-4">
          手動分配籤表
        </h3>
        <p className="text-gray-600">
          至少需要 2 位選手才能生成籤表。目前有 {players.length} 位選手。
        </p>
      </div>
    );
  }

  if (loadingExisting) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <p className="text-gray-600">載入中...</p>
      </div>
    );
  }

  const getGenerationMethodText = () => {
    if (!event?.bracket_generation_method) return null;
    const methods = {
      auto: '自動生成',
      manual: '手動建立',
      imported: '匯入',
    };
    return methods[event.bracket_generation_method];
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('zh-TW');
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      {/* Bracket Status Banner */}
      {event && (event.bracket_generation_method || event.bracket_generated_at) && (
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          isLocked 
            ? 'bg-red-50 border-red-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLocked ? (
                <span className="text-2xl">🔒</span>
              ) : (
                <span className="text-2xl">🔓</span>
              )}
              <div>
                <p className="font-semibold text-gray-800">
                  籤表狀態：{getGenerationMethodText() || '未生成'}
                  {isLocked && <span className="ml-2 text-red-600">（已鎖定）</span>}
                </p>
                {event.bracket_generated_at && (
                  <p className="text-sm text-gray-600 mt-1">
                    生成時間：{formatDate(event.bracket_generated_at)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isLocked ? (
                <button
                  onClick={() => setShowUnlockModal(true)}
                  className="px-4 py-2 bg-ntu-green text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  🔓 解鎖編輯
                </button>
              ) : (
                <button
                  onClick={handleLock}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  🔒 鎖定籤表
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">解鎖籤表</h3>
            <p className="text-gray-600 mb-4">
              解鎖後可以編輯籤表。請填寫解鎖原因以記錄在審計日誌中。
            </p>
            <textarea
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              placeholder="例如：需要調整選手位置、修正錯誤等..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green mb-4"
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockReason("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUnlock}
                disabled={!unlockReason.trim()}
                className="px-4 py-2 bg-ntu-green text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                確認解鎖
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-ntu-green mb-2">
            🎯 手動分配籤表
          </h3>
          <p className="text-sm text-gray-600">
            拖曳選手到籤表位置，或點擊位置後從下拉選單選擇選手
            {isLocked && <span className="text-red-600 ml-2">（目前鎖定中）</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            disabled={isLocked}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            清除全部
          </button>
          <button
            onClick={handleAutoFill}
            disabled={unassignedPlayers.length === 0 || isLocked}
            className="px-4 py-2 text-sm border border-ntu-green text-ntu-green rounded-lg hover:bg-ntu-green hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            自動填充
          </button>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-600 space-y-1">
        <p>
          選手數: <strong>{players.length}</strong> | 籤表大小:{" "}
          <strong>{bracketSize}</strong> | 輪數: <strong>{numRounds}</strong> |
          輪空: <strong>{numByes}</strong>
        </p>
        <p>
          已分配: <strong>{players.length - unassignedPlayers.length}</strong> |{" "}
          未分配: <strong>{unassignedPlayers.length}</strong>
        </p>
      </div>

      {/* Third Place Match Option */}
      {players.length >= 4 && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="thirdPlaceMatch"
            checked={hasThirdPlaceMatch}
            onChange={(e) => setHasThirdPlaceMatch(e.target.checked)}
            className="w-4 h-4 text-ntu-green border-gray-300 rounded focus:ring-ntu-green cursor-pointer"
          />
          <label
            htmlFor="thirdPlaceMatch"
            className="text-sm text-gray-700 cursor-pointer hover:text-ntu-green"
          >
            🥉 舉辦季軍賽（準決賽敗者爭奪第三名）
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unassigned Players */}
        <div>
          <h4 className="text-lg font-semibold text-gray-700 mb-3">
            未分配選手 ({unassignedPlayers.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {unassignedPlayers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                所有選手都已分配
              </p>
            ) : (
              unassignedPlayers.map((player) => (
                <div
                  key={player.id}
                  draggable
                  onDragStart={() => handleDragStart(player)}
                  onDragEnd={handleDragEnd}
                  className="bg-white border border-gray-300 rounded-lg p-3 cursor-move hover:border-ntu-green hover:bg-ntu-green/5 transition-colors active:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-700">
                        {player.name}
                        {player.seed && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                            Seed {player.seed}
                          </span>
                        )}
                      </p>
                      {player.department && (
                        <p className="text-xs text-gray-500">{player.department}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">拖曳</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assigned Players */}
        <div>
          <h4 className="text-lg font-semibold text-gray-700 mb-3">
            已分配選手 ({assignedPlayers.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {assignedPlayers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                尚未分配任何選手
              </p>
            ) : (
              assignedPlayers
                .sort((a, b) => a.position - b.position)
                .map(({ player, position }) => (
                  <div
                    key={`${player.id}-${position}`}
                    draggable
                    onDragStart={() => handleDragStart(player)}
                    onDragEnd={handleDragEnd}
                    className="bg-white border border-gray-300 rounded-lg p-3 cursor-move hover:border-ntu-green hover:bg-ntu-green/5 transition-colors active:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-700 text-sm">
                          {player.name}
                          {player.seed && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              Seed {player.seed}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          位置 #{position + 1}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">拖曳</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Bracket Positions */}
        <div>
          <h4 className="text-lg font-semibold text-gray-700 mb-3">
            籤表位置 ({bracketSize})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {bracketPositions.map((pos, index) => {
              const isEven = index % 2 === 0;
              const matchNumber = Math.floor(index / 2) + 1;
              const isSelected = selectedPosition === index;
              const opponentIndex = isEven ? index + 1 : index - 1;
              const opponent = bracketPositions[opponentIndex]?.player;
              const hasBothPlayers = pos.player && opponent;
              const hasOnePlayer = (pos.player || opponent) && !hasBothPlayers;

              return (
                <div
                  key={index}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(index)}
                  onClick={() => handlePositionClick(index)}
                  className={`border rounded-lg p-3 transition-all ${
                    isSelected
                      ? "border-ntu-green border-2 bg-ntu-green/10"
                      : dragOverPosition === index
                      ? "border-ntu-green border-2 bg-ntu-green/20"
                      : hasBothPlayers
                      ? "border-green-300 bg-green-50"
                      : hasOnePlayer
                      ? "border-yellow-300 bg-yellow-50"
                      : "border-gray-300 hover:border-ntu-green hover:bg-gray-50"
                  } ${isEven ? "mb-2" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 font-mono">
                          位置 #{index + 1}
                        </span>
                        {isEven && (
                          <span className="text-xs text-gray-400">
                            比賽 #{matchNumber}
                          </span>
                        )}
                        {hasBothPlayers && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                            ✓ 已配對
                          </span>
                        )}
                        {hasOnePlayer && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                            ⚠ 需配對
                          </span>
                        )}
                      </div>
                      {pos.player ? (
                        <div>
                          <p className="font-semibold text-gray-700">
                            {pos.player.name}
                            {pos.player.seed && (
                              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                Seed {pos.player.seed}
                              </span>
                            )}
                          </p>
                          {pos.player.department && (
                            <p className="text-xs text-gray-500">
                              {pos.player.department}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          {isSelected ? "請從下方選擇選手" : "點擊選擇或拖曳選手"}
                        </p>
                      )}
                    </div>
                    {pos.player && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePlayer(index);
                        }}
                        className="ml-2 text-red-500 hover:text-red-700 text-sm"
                        title="移除選手"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {isSelected && (
                    <div className="mt-2">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handlePlayerSelect(e.target.value);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green text-sm"
                      >
                        <option value="">選擇選手...</option>
                        {players.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                            {player.seed ? ` (Seed ${player.seed})` : ""}
                            {player.department ? ` · ${player.department}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading || isLocked}
          className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "儲存中..." : isLocked ? "🔒 籤表已鎖定" : "💾 儲存籤表"}
        </button>
      </div>
    </div>
  );
}

