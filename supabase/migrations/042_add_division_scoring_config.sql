-- Add scoring_config to event_divisions
-- This allows admins to define what scoring terminology is used (Goals vs Sets vs Points),
-- and whether to show/hide League Points or Draws on player profile pages.

ALTER TABLE event_divisions
ADD COLUMN IF NOT EXISTS scoring_config JSONB DEFAULT '{
  "scoreName": "goals",
  "hideLeaguePoints": false,
  "hideDraws": false
}'::jsonb;

COMMENT ON COLUMN event_divisions.scoring_config IS 'Configuration for stats/terminology display (e.g., {"scoreName": "sets", "hideLeaguePoints": true, "hideDraws": true}).';

-- Set a smarter default for existing tennis/racket divisions.
UPDATE event_divisions
SET scoring_config = jsonb_set(
  jsonb_set(
    scoring_config, 
    '{scoreName}', 
    '"sets"'::jsonb
  ),
  '{hideDraws}',
  'true'::jsonb
)
WHERE sport IN ('tennis', 'badminton', 'tabletennis', 'volleyball');

-- Set default for existing basketball divisions
UPDATE event_divisions
SET scoring_config = jsonb_set(
  jsonb_set(
    scoring_config, 
    '{scoreName}', 
    '"points"'::jsonb
  ),
  '{hideDraws}',
  'true'::jsonb
)
WHERE sport = 'basketball';

-- Optionally, if an event is clearly single-elimination (tournament_type = 'bracket'), we can hide league points.
-- We join against events.
UPDATE event_divisions ed
SET scoring_config = jsonb_set(
  scoring_config,
  '{hideLeaguePoints}',
  'true'::jsonb
)
FROM events e
WHERE ed.event_id = e.id AND e.tournament_type = 'bracket';
