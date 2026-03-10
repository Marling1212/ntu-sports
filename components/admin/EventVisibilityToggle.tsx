"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface EventVisibilityToggleProps {
  eventId: string;
  initialVisibility: boolean;
}

export default function EventVisibilityToggle({ eventId, initialVisibility }: EventVisibilityToggleProps) {
  const [isVisible, setIsVisible] = useState(initialVisibility);
  const [isToggling, setIsToggling] = useState(false);
  const supabase = createClient();

  const toggleVisibility = async () => {
    setIsToggling(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_visible: !isVisible })
        .eq("id", eventId);

      if (error) throw error;
      
      setIsVisible(!isVisible);
      toast.success(`Event is now ${!isVisible ? 'visible' : 'hidden'} on the public site!`);
    } catch (err: any) {
      toast.error(`Error toggling visibility: ${err.message}`);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={toggleVisibility}
      disabled={isToggling}
      className={`text-xs uppercase font-semibold px-2 py-1 rounded transition-colors border ${
        isVisible 
          ? 'bg-green-600 text-white border-green-700 hover:bg-green-700' 
          : 'bg-white bg-opacity-20 text-white border-white border-opacity-30 hover:bg-opacity-30'
      } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isVisible ? 'Currently Public: Click to hide from public' : 'Currently Hidden: Click to publish on public site'}
    >
      {isToggling ? 'Updating...' : (isVisible ? '🟢 Public' : '🔴 Hidden')}
    </button>
  );
}
