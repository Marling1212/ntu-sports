-- 033_enable_rls_public_tables.sql
-- Fix Supabase linter: enable RLS on all public tables that are exposed to PostgREST
-- Resolves: policy_exists_rls_disabled, rls_disabled_in_public

-- 1. Organizers: Re-enable RLS (was disabled in 006_disable_rls_organizers.sql for testing)
-- Policies already exist from 001, 004, 005
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

-- 2. Event courts: Enable RLS + policies
ALTER TABLE public.event_courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event courts"
  ON public.event_courts FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage event courts"
  ON public.event_courts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = event_courts.event_id
      AND organizers.user_id = auth.uid()
    )
  );

-- 3. Event slots: Enable RLS + policies
ALTER TABLE public.event_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read event slots"
  ON public.event_slots FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage event slots"
  ON public.event_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = event_slots.event_id
      AND organizers.user_id = auth.uid()
    )
  );

-- 4. Team blackouts: Enable RLS + policies
ALTER TABLE public.team_blackouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage team blackouts"
  ON public.team_blackouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = team_blackouts.event_id
      AND organizers.user_id = auth.uid()
    )
  );

-- 5. Push subscriptions: Enable RLS + policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage push subscriptions for their events"
  ON public.push_subscriptions FOR ALL
  USING (
    event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = push_subscriptions.event_id
      AND organizers.user_id = auth.uid()
    )
  );

-- 6. Team blackout templates: Enable RLS + policies
ALTER TABLE public.team_blackout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage team blackout templates"
  ON public.team_blackout_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = team_blackout_templates.event_id
      AND organizers.user_id = auth.uid()
    )
  );

-- 7. Event slot templates: Enable RLS + policies
ALTER TABLE public.event_slot_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage event slot templates"
  ON public.event_slot_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = event_slot_templates.event_id
      AND organizers.user_id = auth.uid()
    )
  );

-- 8. Bracket edit history: Enable RLS + policies (audit trail, read-only for most)
ALTER TABLE public.bracket_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view bracket edit history for their events"
  ON public.bracket_edit_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = bracket_edit_history.event_id
      AND organizers.user_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can insert bracket edit history"
  ON public.bracket_edit_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = bracket_edit_history.event_id
      AND organizers.user_id = auth.uid()
    )
  );
