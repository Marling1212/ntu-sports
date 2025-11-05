-- Add 'bye' status to matches table
-- This allows matches where one player gets a BYE (automatic advance)

-- Drop the existing constraint
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;

-- Add new constraint with 'bye' status
ALTER TABLE matches ADD CONSTRAINT matches_status_check 
  CHECK (status IN ('upcoming', 'live', 'completed', 'bye'));

-- Comment
COMMENT ON COLUMN matches.status IS 'Match status: upcoming, live, completed, or bye (player auto-advances)';

