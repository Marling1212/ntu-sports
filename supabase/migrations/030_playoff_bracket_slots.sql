-- Playoff bracket slot placeholders (seed + group) for season_play.
-- When set, bracket shows "Seed N Group M" until standings resolve to a player.
-- Admin can edit which seed/group goes in which bracket position before season ends.

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS slot1_seed INTEGER,
ADD COLUMN IF NOT EXISTS slot1_group INTEGER,
ADD COLUMN IF NOT EXISTS slot2_seed INTEGER,
ADD COLUMN IF NOT EXISTS slot2_group INTEGER;

COMMENT ON COLUMN matches.slot1_seed IS 'Playoff slot: seed (1-based) in group. NULL = use player1_id.';
COMMENT ON COLUMN matches.slot1_group IS 'Playoff slot: group number. NULL = use player1_id.';
COMMENT ON COLUMN matches.slot2_seed IS 'Playoff slot: seed (1-based) in group. NULL = use player2_id.';
COMMENT ON COLUMN matches.slot2_group IS 'Playoff slot: group number. NULL = use player2_id.';
