-- Add the missing organizer record for the existing event
-- This connects your user to the event you created

INSERT INTO organizers (user_id, event_id, role)
VALUES (
  'a19a41d6-944c-41c3-afb6-f552446d8a50',
  '8bca19ac-df24-46ae-84e1-1732f61c89f5',
  'owner'
) ON CONFLICT (user_id, event_id) DO NOTHING;

