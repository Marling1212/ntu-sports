-- Allow events and divisions to configure bracket split mode for 64-draw single elimination tournaments
-- '4_sections': split into 4 sections (16 each), finals stage includes Quarterfinals, Semifinals, and Final (default)
-- '2_sections': split into 2 halves (32 each), finals stage includes Semifinals and Final
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS bracket_split_mode TEXT NOT NULL DEFAULT '4_sections';

ALTER TABLE public.event_divisions
ADD COLUMN IF NOT EXISTS bracket_split_mode TEXT DEFAULT NULL;

