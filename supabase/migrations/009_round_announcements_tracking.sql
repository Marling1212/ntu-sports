-- Create table to track which rounds have had completion announcements
CREATE TABLE IF NOT EXISTS public.round_completion_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(event_id, round)
);

-- Create index
CREATE INDEX idx_round_completion_event_round ON public.round_completion_announcements(event_id, round);

-- Enable RLS
ALTER TABLE public.round_completion_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read round completion announcements"
  ON public.round_completion_announcements FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage round completion announcements"
  ON public.round_completion_announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = round_completion_announcements.event_id
      AND organizers.user_id = auth.uid()
    )
  );

