-- ============================================================
-- ADD NEXT_SESSION_DATE TO CLIENTS TABLE
-- Purpose: Allows therapists to schedule their next session
--          with a client, displayed on the dashboard
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add the next_session_date column if it doesn't exist
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS next_session_date TIMESTAMPTZ DEFAULT NULL;

-- Add a comment explaining the field's purpose
COMMENT ON COLUMN clients.next_session_date IS
  'Therapist-entered datetime for the next scheduled session. Used for dashboard "Next Session" column and client context.';

-- Optional: Set a sample next session date for the demo client
-- UPDATE clients
-- SET next_session_date = NOW() + INTERVAL '3 days'
-- WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name = 'next_session_date';
