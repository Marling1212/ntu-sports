-- Add group column to matches table for season play grouping
ALTER TABLE matches
ADD COLUMN group_number INTEGER;

COMMENT ON COLUMN matches.group_number IS 'Group number for season play tournaments (round-robin within groups). NULL for single elimination or ungrouped matches.';

