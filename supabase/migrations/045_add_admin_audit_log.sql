-- P3: Admin Audit Log — who changed what, when

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID REFERENCES events(id) ON DELETE SET NULL,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID,
  before_data  JSONB,
  after_data   JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_event_created
  ON admin_audit_log(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity
  ON admin_audit_log(entity_type, entity_id);

COMMENT ON TABLE admin_audit_log IS 'Log of admin actions (e.g. match score updates) for accountability and dispute resolution';

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view audit log for their events"
  ON admin_audit_log FOR SELECT
  USING (
    event_id IS NULL
    OR EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = admin_audit_log.event_id
        AND o.user_id = auth.uid()
    )
  );

-- Only organizers for the event can insert (e.g. when saving match from admin)
CREATE POLICY "Organizers can insert audit log for their events"
  ON admin_audit_log FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      event_id IS NULL
      OR EXISTS (
        SELECT 1 FROM organizers o
        WHERE o.event_id = admin_audit_log.event_id
          AND o.user_id = auth.uid()
      )
    )
  );
