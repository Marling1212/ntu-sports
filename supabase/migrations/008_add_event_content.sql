-- Create table for tournament rules
CREATE TABLE IF NOT EXISTS public.tournament_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create table for schedule items
CREATE TABLE IF NOT EXISTS public.schedule_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL, -- 1 for Day 1, 2 for Day 2, etc.
  day_title VARCHAR(100) NOT NULL, -- e.g., "2025/11/8 (六)"
  location VARCHAR(255), -- e.g., "國立台灣大學新生網球場（5-8場）"
  order_number INTEGER NOT NULL,
  group_name VARCHAR(50), -- e.g., "1-80籤"
  round_name VARCHAR(50), -- e.g., "第一輪 R1"
  match_count INTEGER, -- Number of matches
  scheduled_time VARCHAR(50), -- e.g., "8:00" or "NB 10:00"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_tournament_rules_event_id ON public.tournament_rules(event_id);
CREATE INDEX idx_schedule_items_event_id ON public.schedule_items(event_id);
CREATE INDEX idx_schedule_items_day ON public.schedule_items(event_id, day_number);

-- Enable RLS
ALTER TABLE public.tournament_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_rules
CREATE POLICY "Anyone can read tournament rules"
  ON public.tournament_rules FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage tournament rules"
  ON public.tournament_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = tournament_rules.event_id
      AND organizers.user_id = auth.uid()
    )
  );

-- RLS Policies for schedule_items
CREATE POLICY "Anyone can read schedule items"
  ON public.schedule_items FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage schedule items"
  ON public.schedule_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers
      WHERE organizers.event_id = schedule_items.event_id
      AND organizers.user_id = auth.uid()
    )
  );

-- Add schedule notes field to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS schedule_notes TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS schedule_updated_at VARCHAR(50);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact_info TEXT;

-- Add some default data (optional - you can customize this)
-- This will add default rules for existing events
-- You can run this or skip it and add rules manually through the admin panel

