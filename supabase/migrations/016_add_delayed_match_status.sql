-- Allow matches to be marked as delayed

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;

ALTER TABLE matches
  ADD CONSTRAINT matches_status_check
  CHECK (
    status IN (
      'upcoming',
      'live',
      'completed',
      'bye',
      'delayed'
    )
  );

COMMENT ON COLUMN matches.status IS
  'Match status: upcoming, live, completed, bye (auto advance), or delayed (postponed match)';

