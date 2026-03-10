"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface CreateEventModalProps {
  userId: string;
  onEventCreated: (newId?: string) => void;
  onClose: () => void;
}

type ExtraDivision = { sport: string; tournamentType: string; registrationType: string };

export default function CreateEventModal({ userId, onEventCreated, onClose }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    sport: "tennis",
    name: "",
    startDate: "",
    endDate: "",
    venue: "",
    description: "",
    tournamentType: "single_elimination",
    registrationType: "player",
    isMultiSport: false,
    extraSports: [] as ExtraDivision[],
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

      // Create division(s) for this event; each can have its own tournament_type (e.g. Tennis single elim, Basketball season play)
      const divisionsToCreate: { sport: string; tournament_type: string; registration_type: string }[] = formData.extraSports?.length
        ? [
            { sport: formData.sport, tournament_type: formData.tournamentType, registration_type: formData.registrationType },
            ...formData.extraSports.map((e) => ({
              sport: e.sport,
              tournament_type: e.tournamentType ?? formData.tournamentType,
              registration_type: e.registrationType ?? formData.registrationType,
            })),
          ]
        : [{ sport: formData.sport, tournament_type: formData.tournamentType, registration_type: formData.registrationType }];
      for (let i = 0; i < divisionsToCreate.length; i++) {
        const d = divisionsToCreate[i];
        const { error: divError } = await supabase.from("event_divisions").insert({
          event_id: event.id,
          sport: d.sport,
          display_order: i,
          tournament_type: d.tournament_type,
          registration_type: d.registration_type,
        });
        if (divError) {
          console.error("Division insert error:", divError);
          toast.error(`Event created but failed to add division: ${divError.message}`);
        }
      }

      console.log("Event created:", event);
      toast.success("Event created successfully! Refreshing...");
      
      // Wait a moment then refresh
      // Wait a moment then redirect to settings
      setTimeout(() => {
        onEventCreated(event.id); 
      }, 500);
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="multiSport"
              checked={formData.isMultiSport}
              onChange={(e) => setFormData({ ...formData, isMultiSport: e.target.checked })}
              className="rounded border-gray-300 text-ntu-green focus:ring-ntu-green"
            />
            <label htmlFor="multiSport" className="text-sm font-medium text-gray-700">
              Multi-sport event (one event, multiple sports/divisions)
            </label>
          </div>
          {formData.isMultiSport && (
            <div className="pl-4 border-l-2 border-ntu-green/30 space-y-3">
              <p className="text-xs text-gray-600">Additional sports — each can be Single Elim or Season Play:</p>
              {(formData.extraSports || []).map((_, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex gap-2 items-center flex-wrap">
                    <select
                      value={formData.extraSports[i].sport}
                      onChange={(e) => {
                        const next = [...(formData.extraSports || [])];
                        next[i] = { ...next[i], sport: e.target.value };
                        setFormData({ ...formData, extraSports: next });
                      }}
                      className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="tennis">Tennis</option>
                      <option value="basketball">Basketball</option>
                      <option value="volleyball">Volleyball</option>
                      <option value="badminton">Badminton</option>
                      <option value="soccer">Soccer</option>
                      <option value="tabletennis">Table Tennis</option>
                      <option value="baseball">Baseball</option>
                      <option value="softball">Softball</option>
                      <option value="other">Other</option>
                    </select>
                    <select
                      value={formData.extraSports[i].tournamentType}
                      onChange={(e) => {
                        const next = [...(formData.extraSports || [])];
                        next[i] = { ...next[i], tournamentType: e.target.value };
                        setFormData({ ...formData, extraSports: next });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="single_elimination">Single elimination</option>
                      <option value="season_play">Season play (groups)</option>
                    </select>
                    <select
                      value={formData.extraSports[i].registrationType}
                      onChange={(e) => {
                        const next = [...(formData.extraSports || [])];
                        next[i] = { ...next[i], registrationType: e.target.value };
                        setFormData({ ...formData, extraSports: next });
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="player">Player</option>
                      <option value="team">Team</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          extraSports: formData.extraSports.filter((_, j) => j !== i),
                        })
                      }
                      className="text-red-600 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    extraSports: [
                      ...(formData.extraSports || []),
                      { sport: "tennis", tournamentType: "single_elimination", registrationType: "player" },
                    ],
                  })
                }
                className="text-sm text-ntu-green hover:underline"
              >
                + Add another sport
              </button>
            </div>
          )}

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

