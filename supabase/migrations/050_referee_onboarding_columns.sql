-- 050_referee_onboarding_columns.sql
-- Extend event_referees for onboarding and player-profile linking.

ALTER TABLE event_referees
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS linked_player_id UUID REFERENCES players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_referees_linked_player
  ON event_referees(linked_player_id);
