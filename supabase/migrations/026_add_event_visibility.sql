-- Add is_visible field to events table
-- This allows admins to hide events from public view while still managing them in admin
-- Default is false (hidden) so new events are hidden by default until admin makes them visible
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT false NOT NULL;

-- Create index for better query performance on public-facing queries
CREATE INDEX IF NOT EXISTS idx_events_is_visible ON events(is_visible);

-- Set all existing events to visible by default (for backward compatibility)
UPDATE events SET is_visible = true WHERE is_visible IS NULL;


