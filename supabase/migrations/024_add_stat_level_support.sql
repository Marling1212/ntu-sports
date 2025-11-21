-- Add stat_level to sport_stat_definitions to distinguish between team-level and player-level stats
ALTER TABLE sport_stat_definitions
ADD COLUMN IF NOT EXISTS stat_level TEXT NOT NULL DEFAULT 'player' CHECK (stat_level IN ('team', 'player'));

COMMENT ON COLUMN sport_stat_definitions.stat_level IS 'Level of the statistic: team (for entire team) or player (for individual players)';

-- Add team_member_id to match_player_stats for player-level stats in team events
ALTER TABLE match_player_stats
ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE;

COMMENT ON COLUMN match_player_stats.team_member_id IS 'Reference to team_member for player-level stats in team events. NULL for team-level stats or player events.';

-- Create index for team_member_id
CREATE INDEX IF NOT EXISTS idx_match_player_stats_team_member ON match_player_stats(team_member_id);

-- Update existing stat definitions to mark team-level stats
-- For soccer/football: team-level stats
UPDATE sport_stat_definitions
SET stat_level = 'team'
WHERE sport = 'soccer' AND stat_name IN ('goals', 'assists', 'yellow_cards', 'red_cards', 'saves', 'shots', 'shots_on_target', 'fouls', 'minutes_played');

-- For basketball: team-level stats
UPDATE sport_stat_definitions
SET stat_level = 'team'
WHERE sport = 'basketball' AND stat_name IN ('points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'fouls', 'minutes_played', 'field_goals_made', 'field_goals_attempted', 'three_pointers_made', 'three_pointers_attempted', 'free_throws_made', 'free_throws_attempted');

-- For volleyball: team-level stats
UPDATE sport_stat_definitions
SET stat_level = 'team'
WHERE sport = 'volleyball' AND stat_name IN ('kills', 'blocks', 'aces', 'digs', 'assists', 'errors', 'service_errors');

-- For tennis: team-level stats (since tennis is usually individual)
UPDATE sport_stat_definitions
SET stat_level = 'team'
WHERE sport = 'tennis';

-- For badminton: team-level stats
UPDATE sport_stat_definitions
SET stat_level = 'team'
WHERE sport = 'badminton';

-- For table tennis: team-level stats
UPDATE sport_stat_definitions
SET stat_level = 'team'
WHERE sport = 'tabletennis';

-- For baseball/softball: team-level stats
UPDATE sport_stat_definitions
SET stat_level = 'team'
WHERE sport IN ('baseball', 'softball');

-- Now we need to add player-level stats for team sports
-- For soccer: add player-level versions
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default, stat_level)
VALUES
('soccer', 'player_goals', '進球', 'number', 10, TRUE, 'player'),
('soccer', 'player_assists', '助攻', 'number', 11, TRUE, 'player'),
('soccer', 'player_yellow_cards', '黃牌', 'number', 12, TRUE, 'player'),
('soccer', 'player_red_cards', '紅牌', 'number', 13, TRUE, 'player'),
('soccer', 'player_saves', '撲救', 'number', 14, TRUE, 'player'),
('soccer', 'player_shots', '射門', 'number', 15, TRUE, 'player'),
('soccer', 'player_shots_on_target', '射正', 'number', 16, TRUE, 'player'),
('soccer', 'player_fouls', '犯規', 'number', 17, TRUE, 'player'),
('soccer', 'player_minutes_played', '出場時間（分鐘）', 'number', 18, TRUE, 'player')
ON CONFLICT (sport, stat_name) DO NOTHING;

-- For basketball: add player-level versions
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default, stat_level)
VALUES
('basketball', 'player_points', '得分', 'number', 15, TRUE, 'player'),
('basketball', 'player_rebounds', '籃板', 'number', 16, TRUE, 'player'),
('basketball', 'player_assists', '助攻', 'number', 17, TRUE, 'player'),
('basketball', 'player_steals', '抄截', 'number', 18, TRUE, 'player'),
('basketball', 'player_blocks', '阻攻', 'number', 19, TRUE, 'player'),
('basketball', 'player_turnovers', '失誤', 'number', 20, TRUE, 'player'),
('basketball', 'player_fouls', '犯規', 'number', 21, TRUE, 'player'),
('basketball', 'player_minutes_played', '出場時間（分鐘）', 'number', 22, TRUE, 'player'),
('basketball', 'player_field_goals_made', '投籃命中', 'number', 23, TRUE, 'player'),
('basketball', 'player_field_goals_attempted', '投籃出手', 'number', 24, TRUE, 'player'),
('basketball', 'player_three_pointers_made', '三分命中', 'number', 25, TRUE, 'player'),
('basketball', 'player_three_pointers_attempted', '三分出手', 'number', 26, TRUE, 'player'),
('basketball', 'player_free_throws_made', '罰球命中', 'number', 27, TRUE, 'player'),
('basketball', 'player_free_throws_attempted', '罰球出手', 'number', 28, TRUE, 'player')
ON CONFLICT (sport, stat_name) DO NOTHING;

-- For volleyball: add player-level versions
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default, stat_level)
VALUES
('volleyball', 'player_kills', '攻擊得分', 'number', 8, TRUE, 'player'),
('volleyball', 'player_blocks', '攔網得分', 'number', 9, TRUE, 'player'),
('volleyball', 'player_aces', '發球得分', 'number', 10, TRUE, 'player'),
('volleyball', 'player_digs', '防守', 'number', 11, TRUE, 'player'),
('volleyball', 'player_assists', '助攻', 'number', 12, TRUE, 'player'),
('volleyball', 'player_errors', '失誤', 'number', 13, TRUE, 'player'),
('volleyball', 'player_service_errors', '發球失誤', 'number', 14, TRUE, 'player')
ON CONFLICT (sport, stat_name) DO NOTHING;

-- Update the unique constraint to allow same stat_name for different levels
-- First, drop the old constraint
ALTER TABLE sport_stat_definitions
DROP CONSTRAINT IF EXISTS sport_stat_definitions_sport_stat_name_key;

-- Add new constraint that includes stat_level
ALTER TABLE sport_stat_definitions
ADD CONSTRAINT sport_stat_definitions_sport_stat_name_level_key UNIQUE(sport, stat_name, stat_level);

