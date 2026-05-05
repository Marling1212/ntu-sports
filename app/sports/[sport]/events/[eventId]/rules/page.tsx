import { createClient } from "@/lib/supabase/server";
import EventScheduleContent from "@/components/EventScheduleContent";
import { notFound } from "next/navigation";
import { getLocale, getT } from "@/lib/i18n/server";
import { getEventForPublicPage } from "@/lib/utils/getSportEvent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportEventRulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string; eventId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { sport, eventId } = await params;
  const { preview } = await searchParams;
  const sportParam = sport.toLowerCase();
  const supabase = await createClient();

  const event = await getEventForPublicPage(eventId, sportParam, { preview });
  if (!event) notFound();

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
      <div className="pb-[max(2rem,env(safe-area-inset-bottom)+140px)]">
        <EventScheduleContent
          event={event}
          rules={rules || []}
          scheduleByDay={scheduleByDay}
          tiebreakerConfig={(event as any)?.tiebreaker_config ?? undefined}
          sportSlug={sportParam}
          pageTitle={t("navigation.rules")}
          pageSubtitle={t("navigation.rulesDescription")}
        />
      </div>
    </>
  );
}
