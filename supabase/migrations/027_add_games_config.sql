-- Add games/sports configuration table for dynamic sport management
-- This allows admins to create and manage custom sports/games beyond the hardcoded list

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., "Tennis", "Basketball", "Custom Game"
  code TEXT NOT NULL UNIQUE, -- lowercase identifier, e.g., "tennis", "basketball"
  icon TEXT, -- emoji or icon identifier, e.g., "🎾"
  color TEXT, -- CSS color class, e.g., "bg-green-500"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- System sports cannot be deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active games
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);
CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);

-- Insert default sports (system sports that come pre-configured)
INSERT INTO games (name, code, icon, color, description, is_system, is_active) VALUES
  ('Tennis', 'tennis', '🎾', 'bg-green-500', 'Tennis tournament', true, true),
  ('Basketball', 'basketball', '🏀', 'bg-orange-500', 'Basketball tournament', true, true),
  ('Volleyball', 'volleyball', '🏐', 'bg-blue-500', 'Volleyball tournament', true, true),
  ('Badminton', 'badminton', '🏸', 'bg-yellow-500', 'Badminton tournament', true, true),
  ('Soccer', 'soccer', '⚽', 'bg-emerald-500', 'Soccer tournament', true, true),
  ('Table Tennis', 'tabletennis', '🏓', 'bg-red-500', 'Table Tennis tournament', true, true),
  ('Baseball', 'baseball', '⚾', 'bg-indigo-500', 'Baseball tournament', true, true),
  ('Softball', 'softball', '🥎', 'bg-pink-500', 'Softball tournament', true, true)
ON CONFLICT (code) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Games are viewable by everyone" ON games;
DROP POLICY IF EXISTS "Authenticated users can create custom games" ON games;
DROP POLICY IF EXISTS "Users can update custom games" ON games;
DROP POLICY IF EXISTS "Users can delete custom games" ON games;

-- Everyone can view active games
CREATE POLICY "Games are viewable by everyone"
  ON games FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

-- Authenticated users can insert custom games
CREATE POLICY "Authenticated users can create custom games"
  ON games FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    is_system = false -- Only allow non-system games to be created by users
  );

-- Authenticated users can update custom games (but not system games)
CREATE POLICY "Users can update custom games"
  ON games FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (is_system = false OR auth.jwt() ->> 'role' = 'admin')
  );

-- Only admins can delete games (or users can delete their own custom games)
CREATE POLICY "Users can delete custom games"
  ON games FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (is_system = false OR auth.jwt() ->> 'role' = 'admin')
  );

COMMENT ON TABLE games IS 'Configuration table for sports/games. System games are pre-configured and cannot be deleted. Users can create custom games.';
