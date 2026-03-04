-- 038_enable_organizers_rls.sql
-- Enable RLS on public.organizers to satisfy Supabase linter.
-- Policies already exist: "Event owners can add organizers", "Organizers can view other organizers in their events", "Users can view their own organizer records".
-- Reverses the temporary disable in 034_revert_organizers_rls_for_admin.sql.

ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
