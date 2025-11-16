-- Add configurable playoff qualifiers per group to events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS playoff_qualifiers_per_group INTEGER;

COMMENT ON COLUMN events.playoff_qualifiers_per_group IS 'Number of teams qualifying per group into playoffs for season play.';

