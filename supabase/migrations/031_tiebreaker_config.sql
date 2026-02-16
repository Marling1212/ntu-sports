-- Tiebreaker rules for season play standings (configurable per event).
-- When NULL, app uses default: points -> H2H -> goal diff -> goals for -> fair play -> final (admin_decide or alphabetical).

ALTER TABLE events
ADD COLUMN IF NOT EXISTS tiebreaker_config JSONB DEFAULT NULL;

COMMENT ON COLUMN events.tiebreaker_config IS 'Season play ranking tiebreaker: order of criteria and final tiebreaker (admin_decide | alphabetical).';
