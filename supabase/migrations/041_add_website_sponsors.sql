-- Add platform_admins table for Super Admins
CREATE TABLE platform_admins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on platform_admins
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read platform_admins table (or anyone logged in can check themselves)
CREATE POLICY "Users can verify their own platform_admin status"
  ON platform_admins FOR SELECT
  USING (auth.uid() = user_id);

-- Alter sponsors table to make event_id optional
-- This allows for global website sponsors where event_id is NULL
ALTER TABLE sponsors ALTER COLUMN event_id DROP NOT NULL;

-- Update the existing RLS policies on sponsors to factor in global sponsors
-- A global sponsor is one where event_id IS NULL. These can be read by anyone,
-- but only modified by users in platform_admins

-- Read policy: Anyone can read public sponsors (both event and global)
-- (We assume there is already a public select policy from 037_add_sponsors.sql, 
--  but let's ensure it covers event_id IS NULL implicitly since public policies usually just return true)

-- Add Global Sponsor Modification Policies

CREATE POLICY "Platform admins can insert global sponsors"
  ON sponsors FOR INSERT
  WITH CHECK (
    event_id IS NULL AND 
    EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can update global sponsors"
  ON sponsors FOR UPDATE
  USING (
    event_id IS NULL AND 
    EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Platform admins can delete global sponsors"
  ON sponsors FOR DELETE
  USING (
    event_id IS NULL AND 
    EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    )
  );
