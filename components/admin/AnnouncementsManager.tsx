"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { Announcement } from "@/types/database";

interface AnnouncementsManagerProps {
  eventId: string;
  initialAnnouncements: Announcement[];
}

export default function AnnouncementsManager({ eventId, initialAnnouncements }: AnnouncementsManagerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [isAdding, setIsAdding] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" });
  const supabase = createClient();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        event_id: eventId,
        title: newAnnouncement.title,
        content: newAnnouncement.content,
      })
      .select()
      .single();

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      setAnnouncements([data, ...announcements]);
      setNewAnnouncement({ title: "", content: "" });
      setIsAdding(false);
      toast.success("Announcement published!");
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      setAnnouncements(announcements.filter(a => a.id !== announcementId));
      toast.success("Announcement deleted!");
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-ntu-green">Announcements</h2>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-ntu-green text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {isAdding ? "Cancel" : "+ New Announcement"}
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAdd} className="p-6 bg-gray-50 border-b border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                placeholder="Announcement title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ntu-green"
                placeholder="Announcement content..."
                required
              />
            </div>
            <button
              type="submit"
              className="bg-ntu-green text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Publish
            </button>
          </form>
        )}

        <div className="divide-y divide-gray-200">
          {announcements.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No announcements yet. Click &quot;New Announcement&quot; to create one.
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{announcement.title}</h3>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="text-red-600 hover:text-red-900 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-gray-700 mb-3 whitespace-pre-wrap">{announcement.content}</p>
                <p className="text-xs text-gray-500">
                  {new Date(announcement.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

