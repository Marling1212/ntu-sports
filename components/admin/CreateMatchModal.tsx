"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Player } from "@/types/database";

interface CreateMatchModalProps {
  eventId: string;
  players: Player[];
  onMatchCreated: () => void;
  onClose: () => void;
  defaultRound?: number;
  defaultPlayer1Id?: string;
  defaultPlayer2Id?: string;
}

export default function CreateMatchModal({
  eventId,
  players,
  onMatchCreated,
  onClose,
  defaultRound = 0,
  defaultPlayer1Id,
  defaultPlayer2Id,
}: CreateMatchModalProps) {
  const [formData, setFormData] = useState({
    round: defaultRound,
    matchNumber: 1,
    player1Id: defaultPlayer1Id || "",
    player2Id: defaultPlayer2Id || "",
    court: "",
    scheduledTime: "",
    status: "upcoming" as const,
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Get next available match number for the round
  const getNextMatchNumber = async (round: number) => {
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("match_number")
      .eq("event_id", eventId)
      .eq("round", round)
      .order("match_number", { ascending: false })
      .limit(1);

    if (existingMatches && existingMatches.length > 0) {
      return (existingMatches[0].match_number || 0) + 1;
    }
    return 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.player1Id && !formData.player2Id) {
      toast.error("請至少選擇一位選手");
      return;
    }

    setLoading(true);

    try {
      // Get next match number if not specified
      let matchNumber = formData.matchNumber;
      if (matchNumber === 1) {
        matchNumber = await getNextMatchNumber(formData.round);
      }

      const matchData: any = {
        event_id: eventId,
        round: formData.round,
        match_number: matchNumber,
        status: formData.status,
        player1_id: formData.player1Id || null,
        player2_id: formData.player2Id || null,
      };

      if (formData.court) {
        matchData.court = formData.court;
      }

      if (formData.scheduledTime) {
        matchData.scheduled_time = new Date(formData.scheduledTime).toISOString();
      }

      const { error } = await supabase
        .from("matches")
        .insert(matchData);

      if (error) throw error;

      toast.success("比賽已創建！");
      onMatchCreated();
      onClose();
    } catch (error: any) {
      toast.error(`錯誤: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full my-8 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0 sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-xl font-semibold text-ntu-green">創建新比賽</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form id="create-match-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              輪次 (Round) *
            </label>
            <input
              type="number"
              min="0"
              value={formData.round}
              onChange={(e) => setFormData({ ...formData, round: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              0 = 常規賽/小組賽，1+ = 淘汰賽輪次
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              比賽編號 (Match Number)
            </label>
            <input
              type="number"
              min="1"
              value={formData.matchNumber}
              onChange={(e) => setFormData({ ...formData, matchNumber: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              留空或設為 1 將自動使用下一個可用編號
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選手 1 (Player 1)
            </label>
            <select
              value={formData.player1Id}
              onChange={(e) => setFormData({ ...formData, player1Id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">選擇選手...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.seed ? `[${player.seed}] ` : ""}
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              選手 2 (Player 2)
            </label>
            <select
              value={formData.player2Id}
              onChange={(e) => setFormData({ ...formData, player2Id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">選擇選手...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.seed ? `[${player.seed}] ` : ""}
                  {player.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              可留空（將創建 BYE 比賽）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              場地 (Court)
            </label>
            <input
              type="text"
              value={formData.court}
              onChange={(e) => setFormData({ ...formData, court: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="例如：Court 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              比賽時間 (Scheduled Time)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              狀態 (Status) *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="delayed">Delayed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

        </form>

        <div className="p-6 border-t border-gray-200 flex gap-3 flex-shrink-0 sticky bottom-0 bg-white rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
            disabled={loading}
          >
            取消
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const form = document.getElementById('create-match-form') as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={loading}
            className="flex-1 bg-ntu-green text-white py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "創建中..." : "創建比賽"}
          </button>
        </div>
      </div>
    </div>
  );
}
