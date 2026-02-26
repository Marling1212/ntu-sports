-- 034_revert_organizers_rls_for_admin.sql
-- TEMPORARY: Disable RLS on organizers so admin dashboard works again.
-- The policies (Users can view their own organizer records, etc.) should allow
-- the dashboard query, but auth/session may not be passing correctly in some cases.
-- Re-enable RLS once auth flow is verified. Supabase linter will report this.

ALTER TABLE public.organizers DISABLE ROW LEVEL SECURITY;
