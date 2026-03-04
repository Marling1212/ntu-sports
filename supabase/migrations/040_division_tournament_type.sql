-- 040_division_tournament_type.sql
-- Each division can have its own tournament type (season_play vs single_elimination) and registration type.
-- So one event can mix e.g. Tennis = single elim, Basketball = season play.

ALTER TABLE event_divisions
  ADD COLUMN IF NOT EXISTS tournament_type TEXT DEFAULT 'single_elimination'
    CHECK (tournament_type IN ('single_elimination', 'season_play'));

ALTER TABLE event_divisions
  ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'player'
    CHECK (registration_type IN ('player', 'team'));

-- Backfill from parent event (existing divisions inherit event's type)
UPDATE event_divisions ed
SET
  tournament_type = COALESCE(e.tournament_type, 'single_elimination'),
  registration_type = COALESCE(e.registration_type, 'player')
FROM events e
WHERE ed.event_id = e.id;

COMMENT ON COLUMN event_divisions.tournament_type IS 'single_elimination or season_play for this division.';
COMMENT ON COLUMN event_divisions.registration_type IS 'player or team for this division.';
