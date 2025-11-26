-- Fix the unique constraint on match_player_stats to include team_member_id
-- This allows the same stat_name for different team members or team-level vs player-level stats

-- Drop the old unique constraint
ALTER TABLE match_player_stats
DROP CONSTRAINT IF EXISTS match_player_stats_match_id_player_id_stat_name_key;

-- Add new unique constraint that includes team_member_id
-- This allows:
-- - Same stat_name for different team members (team_member_id different)
-- - Same stat_name for team-level (team_member_id is NULL) vs player-level (team_member_id is NOT NULL)
ALTER TABLE match_player_stats
ADD CONSTRAINT match_player_stats_match_id_player_id_stat_name_team_member_id_key 
UNIQUE(match_id, player_id, stat_name, team_member_id);

