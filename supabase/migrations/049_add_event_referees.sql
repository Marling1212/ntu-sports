-- 049_add_event_referees.sql
-- Dedicated referee directory per event for dispatch/scheduling workflows.

CREATE TABLE IF NOT EXISTS event_referees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  display_name TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_referees_event ON event_referees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_referees_event_user ON event_referees(event_id, user_id);

ALTER TABLE event_referees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage event referees"
  ON event_referees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = event_referees.event_id
        AND o.user_id = auth.uid()
    )
  );
