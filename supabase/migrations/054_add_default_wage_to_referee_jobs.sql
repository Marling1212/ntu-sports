-- 054_add_default_wage_to_referee_jobs.sql
-- Adds optional default salary per referee job position.

ALTER TABLE event_referee_jobs
  ADD COLUMN IF NOT EXISTS default_wage NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE event_referee_jobs
  ADD CONSTRAINT event_referee_jobs_default_wage_nonnegative
  CHECK (default_wage >= 0);
