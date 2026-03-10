"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/admin/LogoutButton";
import CreateEventModal from "@/components/admin/CreateEventModal";
import toast, { Toaster } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

import EventCard, { DivisionInfo } from "@/components/admin/EventCard";

interface DashboardContentProps {
  user: any;
  initialEvents: any[];
  divisionsByEventId?: Record<string, DivisionInfo[]>;
}

export default function DashboardContent({ user, initialEvents, divisionsByEventId = {} }: DashboardContentProps) {
  const [events, setEvents] = useState(initialEvents);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  const handleEventCreated = (newId?: string) => {
    setShowCreateModal(false);
    if (newId) {
      router.push(`/admin/${newId}/settings`); // Route directly into the new event
    } else {
      router.refresh();
    }
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
                divisions={divisionsByEventId[event.id] ?? []}
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

