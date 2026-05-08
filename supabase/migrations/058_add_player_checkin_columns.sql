-- Phase 1 MVP: admin manual participant check-in
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS check_in_note text;

CREATE INDEX IF NOT EXISTS idx_players_event_checkin
  ON public.players (event_id, checked_in_at);
