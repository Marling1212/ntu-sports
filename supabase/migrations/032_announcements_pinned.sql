-- Add pinned support for announcements (pin one or more; does not affect "latest" for overview)
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_announcements_event_pinned
  ON public.announcements(event_id, is_pinned, pinned_order NULLS LAST, created_at DESC);

COMMENT ON COLUMN public.announcements.is_pinned IS 'When true, show at top of announcements list (pinned first). Overview "latest" still uses most recent by created_at.';
COMMENT ON COLUMN public.announcements.pinned_order IS 'Order among pinned items (lower = higher). Null for unpinned.';
