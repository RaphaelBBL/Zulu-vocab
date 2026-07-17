// Supabase client + leaderboard/challenge helpers.
//
// The app works fine WITHOUT keys (leaderboard shows a friendly "not set up
// yet" message). Add your keys in .env.local to switch on the shared,
// cross-device features. See README for the 3-minute setup.

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

// ---- owner gating (client-side, matches the no-login design) ------------
const OWNER_CODE = import.meta.env.VITE_OWNER_CODE || ''
export const ownerCodeConfigured = OWNER_CODE.length > 0
export function checkOwnerCode(code) {
  return ownerCodeConfigured && (code || '').trim() === OWNER_CODE
}

// ---- scores -------------------------------------------------------------
// challengeId null/undefined => the main (global) leaderboard.
export async function submitScore({ displayName, score, quizMode, category, accuracy, challengeId }) {
  if (!supabase) return { error: new Error('Leaderboard not configured') }
  const { error } = await supabase.from('scores').insert({
    display_name: displayName,
    score,
    quiz_mode: quizMode,
    category,
    accuracy,
    challenge_id: challengeId || null,
  })
  return { error }
}

export async function fetchTopScores(limit = 50, challengeId = null) {
  if (!supabase) return { data: [], error: new Error('Leaderboard not configured') }
  let q = supabase
    .from('scores')
    .select('id, display_name, score, quiz_mode, category, accuracy, created_at, challenge_id')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)
  q = challengeId ? q.eq('challenge_id', challengeId) : q.is('challenge_id', null)
  const { data, error } = await q
  return { data: data || [], error }
}

// ---- challenges ---------------------------------------------------------
// A challenge = a named vocab set (extracted from the owner's notes) that
// everyone can quiz on, each with its own leaderboard.
export async function fetchChallenges() {
  if (!supabase) return { data: [], error: new Error('Not configured') }
  const { data, error } = await supabase
    .from('challenges')
    .select('id, name, description, words, created_at')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function createChallenge({ name, description, words }) {
  if (!supabase) return { error: new Error('Not configured') }
  const { data, error } = await supabase
    .from('challenges')
    .insert({ name, description, words })
    .select()
    .single()
  return { data, error }
}
