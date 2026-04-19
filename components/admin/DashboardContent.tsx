"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/admin/LogoutButton";
import CreateEventModal from "@/components/admin/CreateEventModal";
import toast, { Toaster } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

import EventCard, { DivisionInfo } from "@/components/admin/EventCard";
import AdminFontSizeControl from "@/components/admin/AdminFontSizeControl";

interface DashboardContentProps {
  user: any;
  initialEvents: any[];
  divisionsByEventId?: Record<string, DivisionInfo[]>;
  isPlatformAdmin?: boolean;
}

export default function DashboardContent({ user, initialEvents, divisionsByEventId = {}, isPlatformAdmin = false }: DashboardContentProps) {
  const [events, setEvents] = useState(initialEvents);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const handleEventCreated = (newId?: string) => {
    setShowCreateModal(false);
    if (newId) {
      router.push(`/admin/${newId}/players`); // Route directly into participant setup
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
            <h1 className="text-4xl font-bold text-ntu-green mb-2">{t("admin.dashboardTitle")}</h1>
            <p className="text-lg text-gray-600">{t("admin.welcome", { email: user?.email || "" })}</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <AdminFontSizeControl variant="light" />
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-ntu-green text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              {t("admin.createEvent")}
            </button>
            {isPlatformAdmin && (
              <Link
                href="/admin/sponsors"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {t("admin.globalSponsorsTitle")}
              </Link>
            )}
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

