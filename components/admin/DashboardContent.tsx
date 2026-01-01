"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/admin/LogoutButton";
import CreateEventModal from "@/components/admin/CreateEventModal";
import toast, { Toaster } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface EventCardProps {
  event: any;
  onVisibilityChange: (eventId: string, newVisibility: boolean) => void;
}

function EventCard({ event, onVisibilityChange }: EventCardProps) {
  const [isVisible, setIsVisible] = useState(event.is_visible ?? false);
  const [isToggling, setIsToggling] = useState(false);
  const supabase = createClient();

  const toggleVisibility = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsToggling(true);
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_visible: !isVisible })
        .eq("id", event.id);

      if (error) {
        toast.error(`Error: ${error.message}`);
      } else {
        const newVisibility = !isVisible;
        setIsVisible(newVisibility);
        onVisibilityChange(event.id, newVisibility);
        toast.success(`Event is now ${newVisibility ? 'visible' : 'hidden'} on public site`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100 relative">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-semibold text-ntu-green">
          {event.name}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-semibold px-2 py-1 bg-ntu-green bg-opacity-10 text-ntu-green rounded">
            {event.sport}
          </span>
          <button
            onClick={toggleVisibility}
            disabled={isToggling}
            className={`text-xs uppercase font-semibold px-2 py-1 rounded transition-colors ${
              isVisible 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isVisible ? 'Click to hide from public' : 'Click to show on public'}
          >
            {isToggling ? '...' : (isVisible ? 'Visible' : 'Hidden')}
          </button>
        </div>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <p><span className="font-semibold">Venue:</span> {event.venue}</p>
        <p>
          <span className="font-semibold">Dates:</span>{" "}
          {new Date(event.start_date).toLocaleDateString()} -{" "}
          {new Date(event.end_date).toLocaleDateString()}
        </p>
        {event.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-3">
            {event.description}
          </p>
        )}
      </div>
      <Link
        href={`/admin/${event.id}/players`}
        className="mt-4 text-ntu-green font-medium text-sm block hover:underline"
      >
        Manage →
      </Link>
    </div>
  );
}

interface DashboardContentProps {
  user: any;
  initialEvents: any[];
}

export default function DashboardContent({ user, initialEvents }: DashboardContentProps) {
  const [events, setEvents] = useState(initialEvents);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  const handleEventCreated = () => {
    // Refresh the page to get updated events
    setShowCreateModal(false);
    router.refresh();
    // Force a hard refresh
    window.location.reload();
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-ntu-green mb-2">Admin Dashboard</h1>
            <p className="text-lg text-gray-600">Welcome, {user.email}</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              + Create Event
            </button>
            <LogoutButton />
          </div>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">No Events Yet</h2>
            <p className="text-gray-600 mb-6">
              Get started by creating your first tournament event.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              + Create Your First Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any) => (
              <EventCard
                key={event.id}
                event={event}
                onVisibilityChange={(eventId, newVisibility) => {
                  setEvents(events.map(e => 
                    e.id === eventId ? { ...e, is_visible: newVisibility } : e
                  ));
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateEventModal
          userId={user.id}
          onEventCreated={handleEventCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}

