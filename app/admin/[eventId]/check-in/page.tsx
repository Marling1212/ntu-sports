import { redirect } from "next/navigation";
import { getEventDivisions } from "@/lib/utils/getSportEvent";

/** Bracket check-in lives on the registrations (players) page. */
export default async function BracketCheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ divisionId?: string }>;
}) {
  const { eventId } = await params;
  const { divisionId: divisionIdParam } = await searchParams;
  const divisions = await getEventDivisions(eventId);
  const divisionQuery =
    divisionIdParam != null && divisionIdParam !== ""
      ? `?divisionId=${divisionIdParam}`
      : divisions.length > 1
        ? `?divisionId=${divisions[0].id}`
        : "";
  redirect(`/admin/${eventId}/players${divisionQuery}#bracket-check-in`);
}
