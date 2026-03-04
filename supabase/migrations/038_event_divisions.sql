-- 038_event_divisions.sql
-- Allow one event to have multiple sports/divisions (e.g. multi-sport event).
-- Existing events get one division (same as event.sport); new events can add more.

-- Divisions within an event (each has a sport; optional name e.g. "Men's Singles")
CREATE TABLE IF NOT EXISTS event_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  name TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_divisions_event_id ON event_divisions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_divisions_sport ON event_divisions(event_id, sport);

-- Backfill: one division per existing event (only if none exist yet for that event)
INSERT INTO event_divisions (event_id, sport, display_order)
SELECT e.id, e.sport, 0 FROM events e
WHERE NOT EXISTS (SELECT 1 FROM event_divisions ed WHERE ed.event_id = e.id);

-- Add division_id to players (nullable for backward compat; backfilled below)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES event_divisions(id) ON DELETE SET NULL;

-- Add division_id to matches (nullable for backward compat; backfilled below)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES event_divisions(id) ON DELETE SET NULL;

-- Backfill: set division_id to the single division for each event
UPDATE players p
SET division_id = (SELECT id FROM event_divisions ed WHERE ed.event_id = p.event_id LIMIT 1)
WHERE division_id IS NULL;

UPDATE matches m
SET division_id = (SELECT id FROM event_divisions ed WHERE ed.event_id = m.event_id LIMIT 1)
WHERE division_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_players_division_id ON players(division_id);
CREATE INDEX IF NOT EXISTS idx_matches_division_id ON matches(division_id);

-- RLS: organizers can manage divisions for their events
ALTER TABLE event_divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view event_divisions for their events"
  ON event_divisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = event_divisions.event_id
    )
  );

CREATE POLICY "Organizers can insert event_divisions for their events"
  ON event_divisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = event_divisions.event_id
    )
  );

CREATE POLICY "Organizers can update event_divisions for their events"
  ON event_divisions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = event_divisions.event_id
    )
  );

CREATE POLICY "Organizers can delete event_divisions for their events"
  ON event_divisions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = event_divisions.event_id
    )
  );

-- Public can read divisions for visible events (needed for /sports/[sport]/events/[eventId])
CREATE POLICY "Public can view event_divisions for visible events"
  ON event_divisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_divisions.event_id AND e.is_visible = true
    )
  );

COMMENT ON TABLE event_divisions IS 'Sports/divisions within an event. One event can have multiple (e.g. Tennis + Basketball).';
COMMENT ON COLUMN event_divisions.sport IS 'Sport slug (e.g. tennis, basketball).';
COMMENT ON COLUMN event_divisions.name IS 'Optional label (e.g. Men Singles, 3v3).';
