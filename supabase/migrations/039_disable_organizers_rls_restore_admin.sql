-- 039_disable_organizers_rls_restore_admin.sql
-- Re-disable RLS on organizers so admin dashboard works again.
-- Auth/session is not passing correctly for organizer checks; until that is fixed, keep RLS off.
-- Supabase linter will continue to report; ignore or fix auth flow first then re-enable RLS.

ALTER TABLE public.organizers DISABLE ROW LEVEL SECURITY;
