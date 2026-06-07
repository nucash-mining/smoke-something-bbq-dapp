import { createClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '../config.js'

// Single shared client. Null when creds aren't set (app falls back to offline
// demo mode driven by localStorage — see lib/db.js and lib/auth.js).
export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey)
  : null
