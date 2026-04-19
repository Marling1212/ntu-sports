import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminPageHeaderBar from "@/components/admin/AdminPageHeaderBar";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug report",
  idea: "Feature idea",
  general: "General",
  design: "Design / colors",
};

export default async function AdminFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!platformAdmin) {
    redirect("/admin/dashboard");
  }

  const { data: feedback, error } = await supabase
    .from("site_feedback")
    .select("id, message, category, email, page_url, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <AdminPageHeaderBar title="Site feedback" backHref="/admin/dashboard" backLabel="← Dashboard" />
        <p className="text-red-600">Failed to load feedback: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <AdminPageHeaderBar title="Site feedback" backHref="/admin/dashboard" backLabel="← Dashboard" />
      <p className="text-sm text-gray-500 mb-6">
        User feedback from the public site. Set <code className="bg-gray-100 px-1 rounded">FEEDBACK_WEBHOOK_URL</code> in env to get notified (e.g. Slack or Zapier webhook).
      </p>
      {!feedback?.length ? (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-8 text-center text-gray-500">
          No feedback yet.
        </div>
      ) : (
        <ul className="space-y-4">
          {feedback.map((row: any) => (
            <li
              key={row.id}
              className="bg-white rounded-xl shadow border border-gray-100 p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
                <span>
                  {new Date(row.created_at).toLocaleString()}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded">
                  {CATEGORY_LABELS[row.category] || row.category || "—"}
                </span>
                {row.email && (
                  <a href={`mailto:${row.email}`} className="text-ntu-green hover:underline">
                    {row.email}
                  </a>
                )}
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{row.message}</p>
              {row.page_url && (
                <p className="text-xs text-gray-400 mt-2 truncate">
                  From: {row.page_url}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
