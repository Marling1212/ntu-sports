-- Add field to track whether to include 3rd place match
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS has_third_place_match BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.events.has_third_place_match IS 'Whether this event includes a 3rd place (bronze medal) match';

