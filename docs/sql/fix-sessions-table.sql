-- ============================================================
-- FIX SESSIONS TABLE FOR SESSION NOTES WORKFLOW
-- Purpose: Ensure the sessions table has all required columns
--          for the Post-Session review workflow
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  session_date DATE DEFAULT CURRENT_DATE,
  duration_minutes INTEGER DEFAULT 50,
  raw_notes TEXT,
  integration_directions JSONB DEFAULT '[]'::jsonb,
  review_completed BOOLEAN DEFAULT FALSE,
  review_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns (safe to run multiple times)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 50;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS raw_notes TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS integration_directions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS review_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments explaining each column
COMMENT ON TABLE sessions IS 'Therapy session records - each row represents one therapy session with a client';
COMMENT ON COLUMN sessions.client_id IS 'The client this session is with';
COMMENT ON COLUMN sessions.therapist_id IS 'The therapist who conducted the session';
COMMENT ON COLUMN sessions.session_date IS 'Date the therapy session occurred';
COMMENT ON COLUMN sessions.duration_minutes IS 'Length of session in minutes (typically 50)';
COMMENT ON COLUMN sessions.raw_notes IS 'Therapist free-text notes from the session';
COMMENT ON COLUMN sessions.integration_directions IS 'AI integration direction (Reflective, Behavioral, etc.) as JSONB array';
COMMENT ON COLUMN sessions.review_completed IS 'Whether therapist has completed post-session review';
COMMENT ON COLUMN sessions.review_completed_at IS 'Timestamp when review was completed';

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;
