-- 061_enable_rls_security.sql
-- Restore Option 1: Keep organizers RLS disabled for admin dashboard and live scoring compatibility.
-- Drops legacy recursive policies and guarantees zero cross-table recursion for tournament operations.
-- Safety sweep ensures all other public tables have Row Level Security enabled.

-- ============================================================================
-- 1. Helper Function: Check Organizer / Admin Status without RLS Recursion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_organizer(p_event_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizers
    WHERE event_id = p_event_id
      AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = p_user_id
  );
$$;

COMMENT ON FUNCTION public.is_organizer IS 'Helper to safely check organizer/admin privileges without RLS policy recursion.';

-- ============================================================================
-- 2. Drop Legacy / Conflicting Policies on public.organizers
-- ============================================================================
DROP POLICY IF EXISTS "Event owners can add organizers" ON public.organizers;
DROP POLICY IF EXISTS "Users can add organizers to their events" ON public.organizers;
DROP POLICY IF EXISTS "Users can view organizers for their events" ON public.organizers;
DROP POLICY IF EXISTS "Users can view their own organizer records" ON public.organizers;
DROP POLICY IF EXISTS "Organizers can view other organizers in their events" ON public.organizers;
DROP POLICY IF EXISTS "Organizers can view their own events" ON public.organizers;
DROP POLICY IF EXISTS "Event owners can view organizers for their events" ON public.organizers;
DROP POLICY IF EXISTS "Platform admins can view all organizers" ON public.organizers;
DROP POLICY IF EXISTS "Event owners and platform admins can update organizers" ON public.organizers;
DROP POLICY IF EXISTS "Users can delete organizer records" ON public.organizers;
DROP POLICY IF EXISTS "Users can update their own organizer records" ON public.organizers;

-- ============================================================================
-- 3. Explicitly Disable RLS on public.organizers (Option 1)
-- ============================================================================
-- Matches project conventions and previous migrations (006, 034, 039).
-- Eliminates all cross-table policy recursion when updating matches or event data.
ALTER TABLE public.organizers DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Safety Sweep: Ensure RLS is Enabled on All Other Public Tables
-- ============================================================================
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.round_completion_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_slot_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_blackout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sport_stat_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.match_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bracket_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roster_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_referees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referee_availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_referee_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.match_referees ENABLE ROW LEVEL SECURITY;
