import { redirect } from "next/navigation";

export default async function RefereeDirectoryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/admin/${eventId}/referees`);
}
