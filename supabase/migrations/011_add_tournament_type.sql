-- Add tournament type support
-- This migration is SAFE: uses DEFAULT values so existing events remain unchanged

-- Add tournament_type column with default value
ALTER TABLE events 
ADD COLUMN tournament_type TEXT DEFAULT 'single_elimination' 
CHECK (tournament_type IN ('single_elimination', 'season_play'));

-- Add comment for documentation
COMMENT ON COLUMN events.tournament_type IS 
'Type of tournament: single_elimination (knockout bracket) or season_play (regular season + playoffs)';

-- All existing events will automatically be 'single_elimination'
-- No data migration needed due to DEFAULT value

