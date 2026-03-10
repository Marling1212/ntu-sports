import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GlobalSponsorManager from "@/components/admin/GlobalSponsorManager";

export default async function GlobalSponsorsPage() {
  const supabase = await createClient();

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // 2. Validate Platform Admin role
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!platformAdmin) {
    // Regular organizers cannot access this route
    redirect("/admin/dashboard");
  }

  // 3. Fetch global sponsors (where event_id is exactly NULL)
  const { data: globalSponsors, error } = await supabase
    .from("sponsors")
    .select("*")
    .is("event_id", null)
    .order("tier", { ascending: true }) // You can also sort by a custom logic or names
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching global sponsors:", error);
  }

  return <GlobalSponsorManager initialSponsors={globalSponsors || []} />;
}
