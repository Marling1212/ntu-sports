-- This migration creates a sample tennis event with organizer
-- You'll need to run this after creating your first user account

-- NOTE: Replace 'YOUR_USER_ID_HERE' with the actual user ID from Supabase Auth
-- You can find this in Supabase Dashboard > Authentication > Users

-- Insert a sample tennis event
INSERT INTO events (id, sport, name, start_date, end_date, venue, owner_id, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'tennis',
  'NTU Tennis – 114 Freshman Cup',
  '2025-11-08 08:00:00+08',
  '2025-11-09 18:00:00+08',
  '新生網球場 5–8 場地',
  'a19a41d6-944c-41c3-afb6-f552446d8a50', -- Replace with your user ID
  'The NTU Tennis 114 Freshman Cup is designed to welcome new students to the NTU tennis community.'
) ON CONFLICT (id) DO NOTHING;

-- Add the owner as an organizer
INSERT INTO organizers (user_id, event_id, role)
VALUES (
  'YOUR_USER_ID_HERE', -- Replace with your user ID
  '00000000-0000-0000-0000-000000000001',
  'owner'
) ON CONFLICT (user_id, event_id) DO NOTHING;

-- NOTE: After creating this event, you can add players and matches through the admin dashboard

