import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Demo mode IDs (from sample data)
export const DEMO_THERAPIST_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
export const DEMO_CLIENT_ID = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'
