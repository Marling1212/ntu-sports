"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { Player } from "@/types/database";
import BulkPlayerImport from "./BulkPlayerImport";

interface PlayersTableProps {
  eventId: string;
  initialPlayers: Player[];
}

export default function PlayersTable({ eventId, initialPlayers }: PlayersTableProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [isAdding, setIsAdding] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: "", department: "", seed: "" });
  const supabase = createClient();

  const refreshPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("event_id", eventId)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    
    if (data) {
      setPlayers(data);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data, error } = await supabase
      .from("players")
      .insert({
        event_id: eventId,
        name: newPlayer.name,
        department: newPlayer.department || null,
        seed: newPlayer.seed ? parseInt(newPlayer.seed) : null,
      })
      .select()
      .single();

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      setPlayers([...players, data]);
      setNewPlayer({ name: "", department: "", seed: "" });
      setIsAdding(false);
      toast.success("Player added successfully!");
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm("Are you sure you want to delete this player?")) return;

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      setPlayers(players.filter(p => p.id !== playerId));
      toast.success("Player deleted successfully!");
    }
  };

  const handleDeleteAll = async () => {
    const confirmText = `⚠️ Are you sure you want to delete ALL ${players.length} players?\n\nThis will also RESET all matches and bracket data!\n\nThis cannot be undone!`;
    
    if (!confirm(confirmText)) return;
    
    // Double confirmation for safety
    if (!confirm("⚠️ FINAL CONFIRMATION: Delete all players and reset all matches?")) return;

    // First, delete round completion tracking
    await supabase
      .from("round_completion_announcements")
      .delete()
      .eq("event_id", eventId);

    // Second, delete all matches for this event
    const { error: matchesError } = await supabase
      .from("matches")
      .delete()
      .eq("event_id", eventId);

    if (matchesError) {
      toast.error(`Error deleting matches: ${matchesError.message}`);
      return;
    }

    // Then, delete all players
    const { error: playersError } = await supabase
      .from("players")
      .delete()
      .eq("event_id", eventId);

    if (playersError) {
      toast.error(`Error deleting players: ${playersError.message}`);
    } else {
      setPlayers([]);
      toast.success("✅ All players and matches deleted! Starting fresh...");
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      
      {showBulkImport && (
        <div className="mb-6">
          <BulkPlayerImport 
            eventId={eventId} 
            onImportComplete={() => {
              setShowBulkImport(false);
              refreshPlayers();
            }}
          />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-ntu-green">Players List ({players.length})</h2>
          <div className="flex gap-3">
            {players.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium border-2 border-red-200 hover:bg-red-600 hover:text-white transition-colors"
              >
                🗑️ Delete All
              </button>
            )}
            <button
              onClick={() => setShowBulkImport(!showBulkImport)}
              className="bg-white text-ntu-green px-4 py-2 rounded-lg font-medium border-2 border-ntu-green hover:bg-ntu-green hover:text-white transition-colors"
            >
              {showBulkImport ? "Hide" : "📋 Bulk Import"}
            </button>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="bg-ntu-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {isAdding ? "Cancel" : "+ Add Player"}
            </button>
          </div>
        </div>

        {isAdding && (
          <form onSubmit={handleAddPlayer} className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Player Name"
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                required
              />
              <input
                type="text"
                placeholder="Department (optional)"
                value={newPlayer.department}
                onChange={(e) => setNewPlayer({ ...newPlayer, department: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              />
              <input
                type="number"
                placeholder="Seed (optional)"
                value={newPlayer.seed}
                onChange={(e) => setNewPlayer({ ...newPlayer, seed: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              />
              <button
                type="submit"
                className="bg-ntu-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Add Player
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No players added yet. Click "Add Player" to get started.
                  </td>
                </tr>
              ) : (
                players.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {player.seed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ntu-green text-white">
                          {player.seed}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {player.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {player.department || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {player.eliminated_round ? (
                        <span className="text-red-600 text-sm">
                          Eliminated (R{player.eliminated_round})
                        </span>
                      ) : (
                        <span className="text-green-600 text-sm">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeletePlayer(player.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
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

