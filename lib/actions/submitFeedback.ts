"use server";

import { createClient } from "@/lib/supabase/server";

export type FeedbackCategory = "bug" | "idea" | "general" | "design";

export async function submitFeedback(formData: {
  message: string;
  category?: FeedbackCategory;
  email?: string;
  page_url?: string;
}) {
  const message = (formData.message || "").trim();
  if (!message) {
    return { ok: false, error: "Message is required." };
  }
  if (message.length > 5000) {
    return { ok: false, error: "Message is too long." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_feedback").insert({
    message,
    category: formData.category || "general",
    email: (formData.email || "").trim() || null,
    page_url: (formData.page_url || "").trim() || null,
  });

  if (error) {
    console.error("submitFeedback error:", error);
    return { ok: false, error: "Failed to submit. Please try again." };
  }
  return { ok: true };
}
