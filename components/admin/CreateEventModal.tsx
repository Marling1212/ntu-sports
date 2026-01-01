"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface CreateEventModalProps {
  userId: string;
  onEventCreated: () => void;
  onClose: () => void;
}

export default function CreateEventModal({ userId, onEventCreated, onClose }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    sport: "tennis",
    name: "",
    startDate: "",
    endDate: "",
    venue: "",
    description: "",
    tournamentType: "single_elimination", // Default to single elimination
    registrationType: "player", // Default to player for backward compatibility
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create event
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          sport: formData.sport,
          name: formData.name,
          start_date: formData.startDate,
          end_date: formData.endDate,
          venue: formData.venue,
          description: formData.description || null,
          owner_id: userId,
          tournament_type: formData.tournamentType,
          registration_type: formData.registrationType,
          is_visible: false, // New events are hidden by default
        })
        .select()
        .single();

      if (eventError) {
        toast.error(`Error creating event: ${eventError.message}`);
        setLoading(false);
        return;
      }

      // Add user as organizer
      const { data: organizer, error: organizerError } = await supabase
        .from("organizers")
        .insert({
          user_id: userId,
          event_id: event.id,
          role: "owner",
        })
        .select()
        .single();

      if (organizerError) {
        console.error("Organizer error:", organizerError);
        toast.error(`Error adding organizer: ${organizerError.message}`);
        setLoading(false);
        return;
      }

      console.log("Event created:", event);
      console.log("Organizer added:", organizer);
      toast.success("Event created successfully! Refreshing...");
      
      // Wait a moment then refresh
      setTimeout(() => {
        onEventCreated();
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Error:", err);
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-2xl font-semibold text-ntu-green">Create New Event</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sport *
            </label>
            <select
              value={formData.sport}
              onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            >
              <option value="tennis">Tennis (網球)</option>
              <option value="basketball">Basketball (籃球)</option>
              <option value="volleyball">Volleyball (排球)</option>
              <option value="badminton">Badminton (羽球)</option>
              <option value="soccer">Soccer (足球)</option>
              <option value="tabletennis">Table Tennis (桌球)</option>
              <option value="baseball">Baseball (棒球)</option>
              <option value="softball">Softball (壘球)</option>
              <option value="other">Other (其他)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tournament Type *
            </label>
            <select
              value={formData.tournamentType}
              onChange={(e) => setFormData({ ...formData, tournamentType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            >
              <option value="single_elimination">Single Elimination (Knockout Bracket)</option>
              <option value="season_play">Season Play (Regular Season + Playoffs)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Single Elimination: Traditional bracket tournament. Season Play: Round-robin regular season followed by playoff bracket.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              報名類型 (Registration Type) *
            </label>
            <select
              value={formData.registrationType}
              onChange={(e) => setFormData({ ...formData, registrationType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              required
            >
              <option value="player">選手 (Player) - 個人報名</option>
              <option value="team">隊伍 (Team) - 團隊報名</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              選擇此賽事的報名類型。選擇「隊伍」時，您可以為每個隊伍添加個別球員的名稱與背號。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="e.g., NTU Tennis – 114 Freshman Cup"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                開始日期 (Start Date) *
              </label>
              <input
                type="date"
                value={formData.startDate.split('T')[0] || ''}
                onChange={(e) => {
                  const time = formData.startDate.split('T')[1] || '08:00';
                  setFormData({ ...formData, startDate: `${e.target.value}T${time}` });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                placeholder="YYYY-MM-DD"
                required
              />
              <p className="text-xs text-gray-500 mt-1">可直接輸入：2025-11-08</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                開始時間 (24hr) *
              </label>
              <input
                type="text"
                value={formData.startDate.split('T')[1] || '08:00'}
                onChange={(e) => {
                  const date = formData.startDate.split('T')[0] || '';
                  setFormData({ ...formData, startDate: `${date}T${e.target.value}` });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                placeholder="HH:MM (e.g., 08:00)"
                pattern="[0-2][0-9]:[0-5][0-9]"
                required
              />
              <p className="text-xs text-gray-500 mt-1">24小時制，例如：08:00 或 18:00</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                結束日期 (End Date) *
              </label>
              <input
                type="date"
                value={formData.endDate.split('T')[0] || formData.startDate.split('T')[0] || ''}
                onChange={(e) => {
                  const time = formData.endDate.split('T')[1] || '18:00';
                  setFormData({ ...formData, endDate: `${e.target.value}T${time}` });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                placeholder="YYYY-MM-DD"
                required
              />
              <p className="text-xs text-gray-500 mt-1">可直接輸入：2025-11-09</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                結束時間 (24hr) *
              </label>
              <input
                type="text"
                value={formData.endDate.split('T')[1] || '18:00'}
                onChange={(e) => {
                  const date = formData.endDate.split('T')[0] || formData.startDate.split('T')[0] || '';
                  setFormData({ ...formData, endDate: `${date}T${e.target.value}` });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                placeholder="HH:MM (e.g., 18:00)"
                pattern="[0-2][0-9]:[0-5][0-9]"
                required
              />
              <p className="text-xs text-gray-500 mt-1">24小時制，例如：14:00 或 18:00</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Venue *
            </label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="e.g., 新生網球場 5–8 場地"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
              placeholder="Event description, rules, or additional information..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-ntu-green text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

