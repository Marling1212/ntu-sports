import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SportRulesPage({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const sportParam = sport.toLowerCase();
  const supabase = await createClient();
  const { data: events } = sportParam
    ? await supabase.from("events").select("id").eq("sport", sportParam).eq("is_visible", true).order("start_date", { ascending: false })
    : { data: [] };
  if (events?.length === 1) {
    redirect(`/sports/${sportParam}/events/${events[0].id}/rules`);
  }
  redirect(`/sports/${sportParam}`);
}
