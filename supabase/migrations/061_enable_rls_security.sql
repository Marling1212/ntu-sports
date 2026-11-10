-- 061_enable_rls_security.sql
-- Fix Supabase Critical Security Alert: Table publicly accessible (rls_disabled_in_public)
-- Re-enables RLS on public.organizers with non-recursive, safe, production-grade policies.
-- Performs a safety sweep to ensure all public schema tables have Row Level Security enabled.

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
-- 2. Drop Legacy / Recursive Policies on public.organizers
-- ============================================================================
-- Earlier policies (such as "Organizers can view other organizers in their events")
-- performed subqueries against organizers itself, causing PostgreSQL infinite recursion
-- ("infinite recursion detected in policy for relation organizers") which previously broke the admin dashboard.
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

-- ============================================================================
-- 3. Enable RLS on public.organizers
-- ============================================================================
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Create Non-Recursive, Secure Policies for public.organizers
-- ============================================================================

-- Policy 1 (SELECT): Users can view their own organizer records
-- Direct comparison (user_id = auth.uid()) without any subqueries to avoid recursion.
CREATE POLICY "Users can view their own organizer records"
  ON public.organizers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2 (SELECT): Event owners can view organizers for events they own
-- Queries events (owner_id = auth.uid()) rather than organizers, completely recursion-free.
CREATE POLICY "Event owners can view organizers for their events"
  ON public.organizers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = organizers.event_id
        AND events.owner_id = auth.uid()
    )
  );

-- Policy 3 (SELECT): Platform admins can view all organizers
CREATE POLICY "Platform admins can view all organizers"
  ON public.organizers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE platform_admins.user_id = auth.uid()
    )
  );

-- Policy 4 (INSERT): Event owners, users adding themselves to events they own, and platform admins can insert
CREATE POLICY "Users can add organizers to their events"
  ON public.organizers FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = organizers.event_id
        AND events.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE platform_admins.user_id = auth.uid()
    )
  );

-- Policy 5 (UPDATE): Event owners and platform admins can update organizer roles
CREATE POLICY "Event owners and platform admins can update organizers"
  ON public.organizers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = organizers.event_id
        AND events.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE platform_admins.user_id = auth.uid()
    )
  );

-- Policy 6 (DELETE): Users can remove themselves, or event owners/platform admins can remove organizers
CREATE POLICY "Users can delete organizer records"
  ON public.organizers FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = organizers.event_id
        AND events.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE platform_admins.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. Comprehensive RLS Safety Sweep for All Public Tables
-- ============================================================================
-- Ensures all public schema tables have Row Level Security enabled
-- to resolve any lingering rls_disabled_in_public Supabase linter notices.
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizers ENABLE ROW LEVEL SECURITY;
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

