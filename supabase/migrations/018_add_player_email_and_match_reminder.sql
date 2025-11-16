-- Players: email + opt-in for reminders
ALTER TABLE players
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN players.email IS 'Primary contact email for the team/player';
COMMENT ON COLUMN players.email_opt_in IS 'Whether the player/team opted in to receive reminder emails';

-- Matches: 48h reminder sent flag to avoid duplicates
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS reminder_sent_48h BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN matches.reminder_sent_48h IS 'True if the 48-hour reminder email has been sent';


