-- Temporary fix: Disable RLS on organizers table for testing
-- This allows you to read/write without policy restrictions

-- WARNING: Only for development/testing
-- Re-enable with proper policies before production

ALTER TABLE organizers DISABLE ROW LEVEL SECURITY;

