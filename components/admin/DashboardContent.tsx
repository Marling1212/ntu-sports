"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/admin/LogoutButton";
import CreateEventModal from "@/components/admin/CreateEventModal";
import toast, { Toaster } from "react-hot-toast";

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
              <Link
                key={event.id}
                href={`/admin/${event.id}/players`}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-semibold text-ntu-green">
                    {event.name}
                  </h2>
                  <span className="text-xs uppercase font-semibold px-2 py-1 bg-ntu-green bg-opacity-10 text-ntu-green rounded">
                    {event.sport}
                  </span>
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
                <div className="mt-4 text-ntu-green font-medium text-sm">
                  Manage →
                </div>
              </Link>
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

