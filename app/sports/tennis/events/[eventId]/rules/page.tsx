import { createClient } from "@/lib/supabase/server";
import TennisNavbarClient from "@/components/TennisNavbarClient";
import EventScheduleContent from "@/components/EventScheduleContent";
import { notFound } from "next/navigation";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TennisEventRulesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("sport", "tennis")
    .eq("is_visible", true)
    .maybeSingle();

  if (error || !event) {
    notFound();
  }

  const { data: rules } = await supabase
    .from("tournament_rules")
    .select("*")
    .eq("event_id", event.id)
    .order("order_number", { ascending: true });

  const { data: scheduleItems } = await supabase
    .from("schedule_items")
    .select("*")
    .eq("event_id", event.id)
    .order("day_number", { ascending: true })
    .order("order_number", { ascending: true });

  const uniqueDays = [...new Set(scheduleItems?.map((s) => s.day_number) || [])].sort();
  const scheduleByDay = uniqueDays.map((dayNumber) => ({
    dayNumber,
    items: scheduleItems?.filter((s) => s.day_number === dayNumber) || [],
    dayInfo: scheduleItems?.find((s) => s.day_number === dayNumber) || null,
  }));

  const locale = await getLocale();
  const t = getT(locale);

  return (
    <>
      <TennisNavbarClient eventName={event.name} tournamentType={event.tournament_type} />
      <EventScheduleContent
        event={event}
        rules={rules || []}
        scheduleByDay={scheduleByDay}
        sportSlug="tennis"
        pageTitle={t("navigation.rules")}
        pageSubtitle={t("navigation.rulesDescription")}
      />
    </>
  );
}
