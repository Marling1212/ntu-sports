import { redirect } from "next/navigation";

/**
 * Bracket Editor is implemented on the Players (Registration) page.
 * Redirect so the "Bracket Editor" nav link goes to the right place.
 */
export default async function BracketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ divisionId?: string }>;
}) {
  const { eventId } = await params;
  const { divisionId } = await searchParams;
  const q = divisionId ? `?divisionId=${divisionId}` : "";
  redirect(`/admin/${eventId}/players${q}#generate-bracket`);
}
