-- 053_create_match_referees.sql
-- Stores referee assignments per match and role/job.

CREATE TABLE IF NOT EXISTS match_referees (
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  role        TEXT NOT NULL,
  wage        NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id, role),
  CONSTRAINT match_referees_wage_nonnegative CHECK (wage >= 0),
  CONSTRAINT match_referees_match_role_unique UNIQUE (match_id, role)
);

CREATE INDEX IF NOT EXISTS idx_match_referees_match
  ON match_referees(match_id);
CREATE INDEX IF NOT EXISTS idx_match_referees_user
  ON match_referees(user_id);

ALTER TABLE match_referees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage match referees"
  ON match_referees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM matches m
      JOIN organizers o ON o.event_id = m.event_id
      WHERE m.id = match_referees.match_id
        AND o.user_id = auth.uid()
    )
  );
