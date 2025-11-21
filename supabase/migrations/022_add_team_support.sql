-- Add registration type to events (player or team)
-- Default to 'player' for backward compatibility with existing events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS registration_type TEXT NOT NULL DEFAULT 'player' CHECK (registration_type IN ('player', 'team'));

COMMENT ON COLUMN events.registration_type IS 'Type of registration: player (individual) or team (group)';

-- Add type to players table to distinguish between individual players and teams
-- Default to 'player' for backward compatibility
ALTER TABLE players
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'player' CHECK (type IN ('player', 'team'));

COMMENT ON COLUMN players.type IS 'Type of entry: player (individual) or team (group)';

-- Create team_members table to store individual players within teams
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE team_members IS 'Individual players within a team, with name and jersey number';
COMMENT ON COLUMN team_members.player_id IS 'Reference to the team (player record with type=team)';
COMMENT ON COLUMN team_members.name IS 'Name of the individual team member';
COMMENT ON COLUMN team_members.jersey_number IS 'Jersey number of the team member (optional)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_team_members_player ON team_members(player_id);
CREATE INDEX IF NOT EXISTS idx_events_registration_type ON events(registration_type);
CREATE INDEX IF NOT EXISTS idx_players_type ON players(type);

-- Enable Row Level Security for team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
-- Everyone can view team members
CREATE POLICY "Team members are viewable by everyone"
  ON team_members FOR SELECT
  USING (true);

-- Organizers can insert team members
CREATE POLICY "Organizers can insert team members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      JOIN organizers o ON o.event_id = p.event_id
      WHERE p.id = team_members.player_id
        AND o.user_id = auth.uid()
    )
  );

-- Organizers can update team members
CREATE POLICY "Organizers can update team members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN organizers o ON o.event_id = p.event_id
      WHERE p.id = team_members.player_id
        AND o.user_id = auth.uid()
    )
  );

-- Organizers can delete team members
CREATE POLICY "Organizers can delete team members"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM players p
      JOIN organizers o ON o.event_id = p.event_id
      WHERE p.id = team_members.player_id
        AND o.user_id = auth.uid()
    )
  );

