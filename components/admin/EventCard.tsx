"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

export interface DivisionInfo {
  id: string;
  event_id: string;
  sport: string;
  name?: string | null;
  display_order: number;
}

interface EventCardProps {
  event: any;
  divisions: DivisionInfo[];
  onVisibilityChange: (eventId: string, newVisibility: boolean) => void;
}

export default function EventCard({ event, divisions, onVisibilityChange }: EventCardProps) {
  const [isVisible, setIsVisible] = useState(event.is_visible ?? false);
  const [isToggling, setIsToggling] = useState(false);
  const supabase = createClient();
  const { t } = useI18n();

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
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border border-gray-100 relative">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-semibold text-ntu-green">
          {event.name}
        </h2>
        <div className="flex items-center gap-2">
          {divisions.length > 1 ? (
            <span className="text-xs uppercase font-semibold px-2 py-1 bg-ntu-green bg-opacity-10 text-ntu-green rounded">
              {divisions.length} 項目
            </span>
          ) : (
            <span className="text-xs uppercase font-semibold px-2 py-1 bg-ntu-green bg-opacity-10 text-ntu-green rounded">
              {event.sport}
            </span>
          )}
          <button
            onClick={toggleVisibility}
            disabled={isToggling}
            className={`text-xs uppercase font-semibold px-2 py-1 rounded transition-colors ${isVisible
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
      <div className="mt-4 space-y-2">
        {divisions.length > 1 ? (
          divisions.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 py-1 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-700 font-medium">
                {d.name ? `${d.sport} – ${d.name}` : d.sport}
              </span>
              <div className="flex items-center gap-3">
                <Link
                  href={`/sports/${d.sport}/events/${event.id}`}
                  className="text-ntu-green text-sm font-medium hover:underline"
                  title={t("admin.viewEvent")}
                >
                  {t("admin.viewEvent")}
                </Link>
                <Link
                  href={`/admin/${event.id}/players?divisionId=${d.id}`}
                  className="text-ntu-green text-sm font-medium hover:underline"
                >
                  Manage →
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-4">
            <Link
              href={divisions[0] ? `/sports/${divisions[0].sport}/events/${event.id}` : `/sports/${event.sport}/events/${event.id}`}
              className="text-ntu-green font-medium text-sm hover:underline"
              title={t("admin.viewEvent")}
            >
              {t("admin.viewEvent")}
            </Link>
            <Link
              href={divisions[0] ? `/admin/${event.id}/players?divisionId=${divisions[0].id}` : `/admin/${event.id}/players`}
              className="text-ntu-green font-medium text-sm hover:underline"
            >
              Manage →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
