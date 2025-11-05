import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DebugPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Get all data for debugging
  const { data: organizers } = await supabase
    .from("organizers")
    .select("*");

  const { data: events } = await supabase
    .from("events")
    .select("*");

  const { data: myOrganizers } = await supabase
    .from("organizers")
    .select("*")
    .eq("user_id", user.id);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-ntu-green mb-8">Debug Info</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-ntu-green mb-4">Your User Info</h2>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-ntu-green mb-4">Your Organizer Records</h2>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(myOrganizers, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-ntu-green mb-4">All Events</h2>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(events, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-ntu-green mb-4">All Organizers</h2>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(organizers, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

