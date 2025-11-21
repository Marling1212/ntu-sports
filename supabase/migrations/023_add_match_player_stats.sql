-- Create sport_stat_definitions table to define customizable statistics for each sport
CREATE TABLE IF NOT EXISTS sport_stat_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport TEXT NOT NULL,
  stat_name TEXT NOT NULL,
  stat_label TEXT NOT NULL,
  stat_type TEXT NOT NULL CHECK (stat_type IN ('number', 'text', 'boolean')),
  default_value TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sport, stat_name)
);

COMMENT ON TABLE sport_stat_definitions IS 'Defines customizable statistics that can be recorded for each sport';
COMMENT ON COLUMN sport_stat_definitions.sport IS 'Sport name (e.g., soccer, basketball, tennis)';
COMMENT ON COLUMN sport_stat_definitions.stat_name IS 'Internal stat name (e.g., goals, assists, yellow_cards)';
COMMENT ON COLUMN sport_stat_definitions.stat_label IS 'Display label (e.g., 進球, 助攻, 黃牌)';
COMMENT ON COLUMN sport_stat_definitions.stat_type IS 'Data type: number, text, or boolean';
COMMENT ON COLUMN sport_stat_definitions.is_default IS 'Whether this is a default stat for the sport or custom added by admin';

-- Create match_player_stats table to record individual player performance in each match
CREATE TABLE IF NOT EXISTS match_player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  stat_name TEXT NOT NULL,
  stat_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, player_id, stat_name)
);

COMMENT ON TABLE match_player_stats IS 'Records individual player statistics for each match';
COMMENT ON COLUMN match_player_stats.stat_name IS 'References sport_stat_definitions.stat_name';
COMMENT ON COLUMN match_player_stats.stat_value IS 'The actual value (stored as text, can be number, text, or boolean)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sport_stat_definitions_sport ON sport_stat_definitions(sport, display_order);
CREATE INDEX IF NOT EXISTS idx_match_player_stats_match ON match_player_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_match_player_stats_player ON match_player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_match_player_stats_match_player ON match_player_stats(match_id, player_id);

-- Enable Row Level Security
ALTER TABLE sport_stat_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sport_stat_definitions
-- Everyone can view stat definitions
CREATE POLICY "Stat definitions are viewable by everyone"
  ON sport_stat_definitions FOR SELECT
  USING (true);

-- Organizers can insert custom stat definitions
CREATE POLICY "Organizers can insert stat definitions"
  ON sport_stat_definitions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organizers o ON o.event_id = e.id
      WHERE e.sport = sport_stat_definitions.sport
        AND o.user_id = auth.uid()
    )
  );

-- Organizers can update stat definitions
CREATE POLICY "Organizers can update stat definitions"
  ON sport_stat_definitions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organizers o ON o.event_id = e.id
      WHERE e.sport = sport_stat_definitions.sport
        AND o.user_id = auth.uid()
    )
  );

-- Organizers can delete custom stat definitions (not defaults)
CREATE POLICY "Organizers can delete custom stat definitions"
  ON sport_stat_definitions FOR DELETE
  USING (
    is_default = FALSE AND
    EXISTS (
      SELECT 1 FROM events e
      JOIN organizers o ON o.event_id = e.id
      WHERE e.sport = sport_stat_definitions.sport
        AND o.user_id = auth.uid()
    )
  );

-- RLS Policies for match_player_stats
-- Everyone can view match player stats
CREATE POLICY "Match player stats are viewable by everyone"
  ON match_player_stats FOR SELECT
  USING (true);

-- Organizers can insert match player stats
CREATE POLICY "Organizers can insert match player stats"
  ON match_player_stats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN organizers o ON o.event_id = m.event_id
      WHERE m.id = match_player_stats.match_id
        AND o.user_id = auth.uid()
    )
  );

-- Organizers can update match player stats
CREATE POLICY "Organizers can update match player stats"
  ON match_player_stats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN organizers o ON o.event_id = m.event_id
      WHERE m.id = match_player_stats.match_id
        AND o.user_id = auth.uid()
    )
  );

-- Organizers can delete match player stats
CREATE POLICY "Organizers can delete match player stats"
  ON match_player_stats FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN organizers o ON o.event_id = m.event_id
      WHERE m.id = match_player_stats.match_id
        AND o.user_id = auth.uid()
    )
  );

-- Insert default statistics for common sports
-- Soccer/Football
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default) VALUES
('soccer', 'goals', '進球', 'number', 1, TRUE),
('soccer', 'assists', '助攻', 'number', 2, TRUE),
('soccer', 'yellow_cards', '黃牌', 'number', 3, TRUE),
('soccer', 'red_cards', '紅牌', 'number', 4, TRUE),
('soccer', 'saves', '撲救', 'number', 5, TRUE),
('soccer', 'shots', '射門', 'number', 6, TRUE),
('soccer', 'shots_on_target', '射正', 'number', 7, TRUE),
('soccer', 'fouls', '犯規', 'number', 8, TRUE),
('soccer', 'minutes_played', '出場時間（分鐘）', 'number', 9, TRUE)
ON CONFLICT (sport, stat_name) DO NOTHING;

-- Basketball
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default) VALUES
('basketball', 'points', '得分', 'number', 1, TRUE),
('basketball', 'rebounds', '籃板', 'number', 2, TRUE),
('basketball', 'assists', '助攻', 'number', 3, TRUE),
('basketball', 'steals', '抄截', 'number', 4, TRUE),
('basketball', 'blocks', '阻攻', 'number', 5, TRUE),
('basketball', 'turnovers', '失誤', 'number', 6, TRUE),
('basketball', 'fouls', '犯規', 'number', 7, TRUE),
('basketball', 'minutes_played', '出場時間（分鐘）', 'number', 8, TRUE),
('basketball', 'field_goals_made', '投籃命中', 'number', 9, TRUE),
('basketball', 'field_goals_attempted', '投籃出手', 'number', 10, TRUE),
('basketball', 'three_pointers_made', '三分命中', 'number', 11, TRUE),
('basketball', 'three_pointers_attempted', '三分出手', 'number', 12, TRUE),
('basketball', 'free_throws_made', '罰球命中', 'number', 13, TRUE),
('basketball', 'free_throws_attempted', '罰球出手', 'number', 14, TRUE)
ON CONFLICT (sport, stat_name) DO NOTHING;

-- Volleyball
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default) VALUES
('volleyball', 'kills', '攻擊得分', 'number', 1, TRUE),
('volleyball', 'blocks', '攔網得分', 'number', 2, TRUE),
('volleyball', 'aces', '發球得分', 'number', 3, TRUE),
('volleyball', 'digs', '防守', 'number', 4, TRUE),
('volleyball', 'assists', '助攻', 'number', 5, TRUE),
('volleyball', 'errors', '失誤', 'number', 6, TRUE),
('volleyball', 'service_errors', '發球失誤', 'number', 7, TRUE)
ON CONFLICT (sport, stat_name) DO NOTHING;

-- Tennis (for team events)
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default) VALUES
('tennis', 'aces', 'Ace球', 'number', 1, TRUE),
('tennis', 'double_faults', '雙發失誤', 'number', 2, TRUE),
('tennis', 'winners', '致勝球', 'number', 3, TRUE),
('tennis', 'unforced_errors', '非受迫性失誤', 'number', 4, TRUE),
('tennis', 'break_points_won', '破發成功', 'number', 5, TRUE),
('tennis', 'break_points_saved', '破發挽救', 'number', 6, TRUE)
ON CONFLICT (sport, stat_name) DO NOTHING;

-- Badminton
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default) VALUES
('badminton', 'smash_winners', '殺球得分', 'number', 1, TRUE),
('badminton', 'net_shots', '網前球', 'number', 2, TRUE),
('badminton', 'drops', '吊球', 'number', 3, TRUE),
('badminton', 'service_errors', '發球失誤', 'number', 4, TRUE),
('badminton', 'unforced_errors', '非受迫性失誤', 'number', 5, TRUE)
ON CONFLICT (sport, stat_name) DO NOTHING;

-- Table Tennis
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default) VALUES
('tabletennis', 'winners', '致勝球', 'number', 1, TRUE),
('tabletennis', 'unforced_errors', '非受迫性失誤', 'number', 2, TRUE),
('tabletennis', 'service_errors', '發球失誤', 'number', 3, TRUE),
('tabletennis', 'service_winners', '發球得分', 'number', 4, TRUE)
ON CONFLICT (sport, stat_name) DO NOTHING;

-- Baseball/Softball
INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default) VALUES
('baseball', 'hits', '安打', 'number', 1, TRUE),
('baseball', 'runs', '得分', 'number', 2, TRUE),
('baseball', 'rbis', '打點', 'number', 3, TRUE),
('baseball', 'strikeouts', '三振', 'number', 4, TRUE),
('baseball', 'walks', '保送', 'number', 5, TRUE),
('baseball', 'stolen_bases', '盜壘', 'number', 6, TRUE),
('baseball', 'errors', '失誤', 'number', 7, TRUE),
('baseball', 'innings_pitched', '投球局數', 'number', 8, TRUE),
('baseball', 'earned_runs', '自責分', 'number', 9, TRUE)
ON CONFLICT (sport, stat_name) DO NOTHING;

INSERT INTO sport_stat_definitions (sport, stat_name, stat_label, stat_type, display_order, is_default) VALUES
('softball', 'hits', '安打', 'number', 1, TRUE),
('softball', 'runs', '得分', 'number', 2, TRUE),
('softball', 'rbis', '打點', 'number', 3, TRUE),
('softball', 'strikeouts', '三振', 'number', 4, TRUE),
('softball', 'walks', '保送', 'number', 5, TRUE),
('softball', 'stolen_bases', '盜壘', 'number', 6, TRUE),
('softball', 'errors', '失誤', 'number', 7, TRUE),
('softball', 'innings_pitched', '投球局數', 'number', 8, TRUE),
('softball', 'earned_runs', '自責分', 'number', 9, TRUE)
ON CONFLICT (sport, stat_name) DO NOTHING;

