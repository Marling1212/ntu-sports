"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";

interface EventVisibilityToggleProps {
  eventId: string;
  initialVisibility: boolean;
}

export default function EventVisibilityToggle({ eventId, initialVisibility }: EventVisibilityToggleProps) {
  const [isVisible, setIsVisible] = useState(initialVisibility);
  const [isToggling, setIsToggling] = useState(false);
  const supabase = createClient();
  const { t } = useI18n();

  const toggleVisibility = async () => {
    setIsToggling(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_visible: !isVisible })
        .eq("id", eventId);

      if (error) throw error;

      setIsVisible(!isVisible);
      toast.success(!isVisible ? t("admin.toggleSuccessPublic") : t("admin.toggleSuccessHidden"));
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
      className={`text-sm uppercase font-semibold px-3 py-1.5 rounded-full transition-colors border shadow-sm flex items-center gap-1.5 ${isVisible
          ? 'bg-green-500 text-white border-green-600 hover:bg-green-600'
          : 'bg-white bg-opacity-20 text-white border-white border-opacity-40 hover:bg-opacity-30'
        } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isVisible ? t("admin.togglePublicHint") : t("admin.toggleHiddenHint")}
    >
      {isToggling ? t("admin.toggleUpdating") : (isVisible ? t("admin.togglePublic") : t("admin.toggleHidden"))}
    </button>
  );
}
