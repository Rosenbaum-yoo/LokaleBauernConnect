import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase-Client nur erzeugen, wenn beide Env-Werte gesetzt sind.
// Solange nicht konfiguriert → null; die Datenschicht nutzt dann Seed-Daten.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseConfigured = supabase !== null
