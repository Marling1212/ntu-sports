-- 055_add_assignment_status_to_match_referees.sql
-- Track assignment lifecycle for referee wage flow.

ALTER TABLE match_referees
  ADD COLUMN IF NOT EXISTS assignment_status TEXT NOT NULL DEFAULT 'assigned';

ALTER TABLE match_referees
  ADD CONSTRAINT match_referees_assignment_status_valid
  CHECK (assignment_status IN ('assigned', 'completed'));

CREATE INDEX IF NOT EXISTS idx_match_referees_assignment_status
  ON match_referees(assignment_status);
