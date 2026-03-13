-- P1: Forfeit & Match Event Flags (Option A: single event_note + event_note_public)

-- Extend match status to include forfeit and walkover
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('upcoming','live','completed','delayed','bye','forfeit','walkover'));

-- Add forfeit metadata
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS forfeit_team_id UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forfeit_reason  TEXT,
  ADD COLUMN IF NOT EXISTS event_note      TEXT,
  ADD COLUMN IF NOT EXISTS event_note_public BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN matches.forfeit_team_id IS 'Team/player that forfeited; NULL for non-forfeit matches';
COMMENT ON COLUMN matches.forfeit_reason  IS 'Admin-entered reason for forfeit or walkover';
COMMENT ON COLUMN matches.event_note       IS 'Admin note for match events (delay, dispute, etc.)';
COMMENT ON COLUMN matches.event_note_public IS 'If true, event_note is shown on public match view; if false, admin-only';
