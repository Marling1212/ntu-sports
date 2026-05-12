import { redirect } from "next/navigation";
import { getEventDivisions } from "@/lib/utils/getSportEvent";

/** Data backup & restore lives on Event Settings. */
export default async function EventBackupPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const divisions = await getEventDivisions(eventId);
  const divisionQuery = divisions.length > 1 ? `?divisionId=${divisions[0].id}` : "";
  redirect(`/admin/${eventId}/settings${divisionQuery}#settings-data-backup`);
}
