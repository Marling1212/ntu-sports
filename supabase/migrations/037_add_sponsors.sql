-- 037_add_sponsors.sql
-- Sponsor management for individual sports events (one-to-many: Event has many Sponsors).

CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT NOT NULL DEFAULT 'Bronze' CHECK (tier IN ('Gold', 'Silver', 'Bronze')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_event_id ON public.sponsors(event_id);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Anyone can read sponsors (for public event pages)
CREATE POLICY "Anyone can read sponsors"
  ON public.sponsors FOR SELECT
  USING (true);

-- Organizers can manage sponsors for their events
CREATE POLICY "Organizers can manage sponsors"
  ON public.sponsors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = sponsors.event_id
      AND organizers.user_id = auth.uid()
    )
  );
