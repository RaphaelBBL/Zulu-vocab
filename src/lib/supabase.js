// Supabase client + leaderboard helpers.
//
// The app works fine WITHOUT keys (leaderboard shows a friendly "not set up
// yet" message). Add your keys in .env.local to switch on the shared,
// cross-device leaderboard. See README for the 3-minute setup.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only treat as configured if both values are present and not the placeholders.
export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    !url.includes('YOUR-PROJECT') &&
    !anonKey.includes('your-anon')
)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

// Submit a score. Returns { error } — null error means success.
export async function submitScore({ displayName, score, quizMode, category, accuracy }) {
  if (!supabase) return { error: new Error('Leaderboard not configured') }
  const { error } = await supabase.from('scores').insert({
    display_name: displayName,
    score,
    quiz_mode: quizMode,
    category,
    accuracy,
  })
  return { error }
}

// Fetch the top N scores (highest first).
export async function fetchTopScores(limit = 50) {
  if (!supabase) return { data: [], error: new Error('Leaderboard not configured') }
  const { data, error } = await supabase
    .from('scores')
    .select('id, display_name, score, quiz_mode, category, accuracy, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)
  return { data: data || [], error }
}
