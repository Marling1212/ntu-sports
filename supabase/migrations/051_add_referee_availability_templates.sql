-- 051_add_referee_availability_templates.sql
-- Weekly referee availability mapped directly to scheduling slot templates.

CREATE TABLE IF NOT EXISTS referee_availability_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL,
  slot_template_id UUID NOT NULL REFERENCES event_slot_templates(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id, slot_template_id)
);

CREATE INDEX IF NOT EXISTS idx_ref_avail_tpl_event_user
  ON referee_availability_templates(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ref_avail_tpl_template
  ON referee_availability_templates(slot_template_id);

ALTER TABLE referee_availability_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage referee availability templates"
  ON referee_availability_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = referee_availability_templates.event_id
        AND o.user_id = auth.uid()
    )
  );
