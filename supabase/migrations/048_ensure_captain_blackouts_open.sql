-- 048_ensure_captain_blackouts_open.sql
-- Safe to run if 046 was skipped; adds events.captain_blackouts_open for captain portal gating.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS captain_blackouts_open BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN events.captain_blackouts_open IS
  'When true, team captains can add/remove weekly blackout templates via the captain portal.';
