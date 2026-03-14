-- 044_add_captain_portal.sql
-- Captain self-service portal: is_captain flag on team_members, roster_change_requests queue.

-- Mark which team_members are captains (informational, shown on public team page)
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS is_captain BOOLEAN NOT NULL DEFAULT FALSE;

-- Roster change request queue (captain submits via token link; admin approves/rejects)
CREATE TABLE IF NOT EXISTS roster_change_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action       TEXT NOT NULL CHECK (action IN ('add', 'remove', 'update')),
  member_data  JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by TEXT,
  admin_note   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

COMMENT ON TABLE roster_change_requests IS 'Captain-submitted roster changes; admin approves or rejects';
COMMENT ON COLUMN roster_change_requests.player_id IS 'The team (players row with type=team) this request applies to';
COMMENT ON COLUMN roster_change_requests.member_data IS 'For add/update: {name, jersey_number}; for update/remove: also member_id';

CREATE INDEX IF NOT EXISTS idx_roster_change_requests_event_status ON roster_change_requests(event_id, status);
CREATE INDEX IF NOT EXISTS idx_roster_change_requests_player ON roster_change_requests(player_id);

ALTER TABLE roster_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage roster change requests"
  ON roster_change_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.event_id = roster_change_requests.event_id
        AND o.user_id = auth.uid()
    )
  );
