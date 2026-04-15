-- 052_add_event_referee_jobs.sql
-- Admin-managed referee job positions per event (e.g., 主裁判, 邊裁判, scorer).

CREATE TABLE IF NOT EXISTS event_referee_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, name)
);

CREATE INDEX IF NOT EXISTS idx_event_referee_jobs_event_order
  ON event_referee_jobs(event_id, display_order, created_at);

ALTER TABLE event_referee_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage referee jobs"
  ON event_referee_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = event_referee_jobs.event_id
        AND o.user_id = auth.uid()
    )
  );
