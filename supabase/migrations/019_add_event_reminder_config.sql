-- Event-level reminder configuration
ALTER TABLE events
ADD COLUMN IF NOT EXISTS reminder_mode TEXT CHECK (reminder_mode IN ('hours', 'games')) DEFAULT 'hours',
ADD COLUMN IF NOT EXISTS reminder_value INTEGER DEFAULT 48;

COMMENT ON COLUMN events.reminder_mode IS 'Reminder trigger mode: hours (X hours before match) or games (X games before match start time)';
COMMENT ON COLUMN events.reminder_value IS 'Reminder value for the chosen mode. Hours or number of games.';


