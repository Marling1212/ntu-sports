-- 046_add_captain_blackouts_open.sql
-- When true, team captains can add/remove their blackout windows via the captain portal.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS captain_blackouts_open BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN events.captain_blackouts_open IS
  'When true, team captains can add/remove their blackout windows via the captain portal.';
