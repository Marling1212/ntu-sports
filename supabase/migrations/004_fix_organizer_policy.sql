-- Fix the organizer insert policy
-- The current policy only allows event owners to add organizers
-- But when creating an event, the user needs to add themselves as organizer

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Event owners can add organizers" ON organizers;

-- Create a new policy that allows:
-- 1. Event owners to add organizers
-- 2. Users to add themselves as organizer when they own the event
CREATE POLICY "Users can add organizers to their events"
  ON organizers FOR INSERT
  WITH CHECK (
    -- Allow if the user is the owner of the event
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = organizers.event_id
        AND events.owner_id = auth.uid()
    )
    OR
    -- Allow if user is adding themselves as organizer to an event they own
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = organizers.event_id
        AND events.owner_id = auth.uid()
    ))
  );

