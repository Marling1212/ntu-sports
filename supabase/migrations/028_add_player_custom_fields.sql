-- Add custom_fields JSONB column to players table
-- This allows storing custom field data (e.g., IQ, custom attributes) for each player

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance on custom_fields
CREATE INDEX IF NOT EXISTS idx_players_custom_fields ON players USING GIN (custom_fields);

-- Add comment
COMMENT ON COLUMN players.custom_fields IS 'JSON object storing custom field values, e.g., {"iq": 120, "custom_field_1": "value"}';
