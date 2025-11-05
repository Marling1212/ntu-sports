-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizers table (many-to-many: users can organize multiple events)
CREATE TABLE organizers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'organizer' CHECK (role IN ('owner', 'organizer', 'editor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT,
  seed INTEGER,
  eliminated_round INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES players(id) ON DELETE SET NULL,
  score1 TEXT,
  score2 TEXT,
  winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  court TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_events_owner ON events(owner_id);
CREATE INDEX idx_organizers_user ON organizers(user_id);
CREATE INDEX idx_organizers_event ON organizers(event_id);
CREATE INDEX idx_players_event ON players(event_id);
CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_matches_round ON matches(round);
CREATE INDEX idx_announcements_event ON announcements(event_id);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
-- Everyone can view events
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- Only authenticated users can create events (and they become the owner)
CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Organizers can update their events
CREATE POLICY "Organizers can update their events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = events.id
    )
  );

-- Organizers can delete their events
CREATE POLICY "Organizers can delete their events"
  ON events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = events.id
    )
  );

-- RLS Policies for organizers
-- Users can view organizers for events they're part of
CREATE POLICY "Users can view organizers for their events"
  ON organizers FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.user_id = auth.uid()
        AND o.event_id = organizers.event_id
    )
  );

-- Event owners can add organizers
CREATE POLICY "Event owners can add organizers"
  ON organizers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = organizers.event_id
        AND events.owner_id = auth.uid()
    )
  );

-- RLS Policies for players
-- Everyone can view players
CREATE POLICY "Players are viewable by everyone"
  ON players FOR SELECT
  USING (true);

-- Organizers can insert players
CREATE POLICY "Organizers can insert players"
  ON players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = players.event_id
    )
  );

-- Organizers can update players
CREATE POLICY "Organizers can update players"
  ON players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = players.event_id
    )
  );

-- Organizers can delete players
CREATE POLICY "Organizers can delete players"
  ON players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = players.event_id
    )
  );

-- RLS Policies for matches
-- Everyone can view matches
CREATE POLICY "Matches are viewable by everyone"
  ON matches FOR SELECT
  USING (true);

-- Organizers can insert matches
CREATE POLICY "Organizers can insert matches"
  ON matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = matches.event_id
    )
  );

-- Organizers can update matches
CREATE POLICY "Organizers can update matches"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = matches.event_id
    )
  );

-- Organizers can delete matches
CREATE POLICY "Organizers can delete matches"
  ON matches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = matches.event_id
    )
  );

-- RLS Policies for announcements
-- Everyone can view announcements
CREATE POLICY "Announcements are viewable by everyone"
  ON announcements FOR SELECT
  USING (true);

-- Organizers can insert announcements
CREATE POLICY "Organizers can insert announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = announcements.event_id
    )
  );

-- Organizers can update announcements
CREATE POLICY "Organizers can update announcements"
  ON announcements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = announcements.event_id
    )
  );

-- Organizers can delete announcements
CREATE POLICY "Organizers can delete announcements"
  ON announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizers
      WHERE organizers.user_id = auth.uid()
        AND organizers.event_id = announcements.event_id
    )
  );

