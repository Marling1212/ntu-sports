-- Add bracket generation tracking and locking mechanism
-- This allows tracking how brackets were created and preventing unauthorized edits

-- Add bracket generation method to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS bracket_generation_method TEXT DEFAULT NULL 
  CHECK (bracket_generation_method IN ('auto', 'manual', 'imported'));

-- Add timestamp for when bracket was generated
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS bracket_generated_at TIMESTAMP WITH TIME ZONE;

-- Add lock status to prevent unauthorized edits
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS bracket_locked BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN events.bracket_generation_method IS 'Method used to generate bracket: auto (generated), manual (manually created), imported (from file)';
COMMENT ON COLUMN events.bracket_generated_at IS 'Timestamp when bracket was first generated';
COMMENT ON COLUMN events.bracket_locked IS 'Whether bracket is locked to prevent edits';

-- Create bracket edit history table for audit trail
CREATE TABLE IF NOT EXISTS bracket_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL, -- References auth.users(id) but we can't use foreign key in migrations
  action TEXT NOT NULL CHECK (action IN ('generate', 'edit', 'lock', 'unlock', 'save')),
  changes JSONB, -- Record specific changes made
  reason TEXT, -- Reason for the action (required for unlock)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bracket_edit_history_event ON bracket_edit_history(event_id);
CREATE INDEX IF NOT EXISTS idx_bracket_edit_history_admin ON bracket_edit_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_bracket_edit_history_created ON bracket_edit_history(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE bracket_edit_history IS 'Audit trail for all bracket generation and editing actions';
COMMENT ON COLUMN bracket_edit_history.action IS 'Type of action: generate, edit, lock, unlock, save';
COMMENT ON COLUMN bracket_edit_history.changes IS 'JSON object recording specific changes made';
COMMENT ON COLUMN bracket_edit_history.reason IS 'Reason for the action (especially important for unlock)';
