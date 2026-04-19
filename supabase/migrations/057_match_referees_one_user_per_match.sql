-- At most one assignment row per (match_id, user_id) across all job roles.
DELETE FROM match_referees mr
WHERE mr.ctid IN (
  SELECT ctid
  FROM (
    SELECT ctid,
           row_number() OVER (PARTITION BY match_id, user_id ORDER BY role) AS rn
    FROM match_referees
  ) sub
  WHERE sub.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS match_referees_match_user_unique
  ON match_referees (match_id, user_id);

comment on index public.match_referees_match_user_unique is 'A user may only hold one referee assignment per match (any role).';
