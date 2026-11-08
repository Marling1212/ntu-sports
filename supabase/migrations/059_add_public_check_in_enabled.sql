-- Allow events to configure whether participant check-in status is shown on public brackets
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS public_check_in_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Also support division-level check-in visibility if needed
ALTER TABLE public.event_divisions
ADD COLUMN IF NOT EXISTS public_check_in_enabled BOOLEAN DEFAULT NULL;
