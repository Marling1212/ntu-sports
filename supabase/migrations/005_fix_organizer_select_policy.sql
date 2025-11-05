-- Fix the organizers SELECT policy
-- The current policy has a circular dependency that blocks reads

-- Drop the old policy
DROP POLICY IF EXISTS "Users can view organizers for their events" ON organizers;

-- Create a simpler policy: users can always view their own organizer records
CREATE POLICY "Users can view their own organizer records"
  ON organizers FOR SELECT
  USING (user_id = auth.uid());

-- Also allow viewing other organizers for events you're part of
CREATE POLICY "Organizers can view other organizers in their events"
  ON organizers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.user_id = auth.uid()
        AND o.event_id = organizers.event_id
    )
  );

