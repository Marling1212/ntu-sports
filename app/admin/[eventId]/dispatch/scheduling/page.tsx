import { redirect } from "next/navigation";

export default async function RefereeSchedulingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/admin/${eventId}/dispatch#ref-availability`);
}
