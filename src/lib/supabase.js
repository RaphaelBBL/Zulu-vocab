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

// ---- admin gating (server-verified; password lives only in the database) --
// Returns true if the password matches the admin_password stored in Supabase.
export async function verifyAdmin(password) {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('is_admin', { p_password: (password || '').trim() })
  return !error && data === true
}

// ---- scores -------------------------------------------------------------
// challengeId null/undefined => the main (global) leaderboard.
export async function submitScore({ displayName, score, quizMode, category, accuracy, challengeId, language, school }) {
  if (!supabase) return { error: new Error('Leaderboard not configured') }
  const { error } = await supabase.from('scores').insert({
    display_name: displayName,
    score,
    quiz_mode: quizMode,
    category,
    accuracy,
    challenge_id: challengeId || null,
    language: language || 'zulu',
    school: school || null,
  })
  return { error }
}

// language: 'zulu' | 'afrikaans' | null (null = combined, both languages).
export async function fetchTopScores(limit = 1000, challengeId = null, language = null) {
  if (!supabase) return { data: [], error: new Error('Leaderboard not configured') }
  let q = supabase
    .from('scores')
    .select('id, display_name, score, quiz_mode, category, accuracy, created_at, challenge_id, language, school')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)
  q = challengeId ? q.eq('challenge_id', challengeId) : q.is('challenge_id', null)
  if (language) q = q.eq('language', language)
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
    .select('id, name, description, words, created_at, language')
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

// Creating a challenge is admin-only (verified server-side by the password).
export async function createChallenge({ name, description, words, password, language }) {
  if (!supabase) return { error: new Error('Not configured') }
  const { data, error } = await supabase.rpc('admin_create_challenge', {
    p_name: name,
    p_description: description || '',
    p_words: words,
    p_language: language || 'zulu',
    p_password: (password || '').trim(),
  })
  return { data, error }
}

// ---- schools ------------------------------------------------------------
export async function fetchSchools() {
  if (!supabase) return { data: [], error: new Error('Not configured') }
  const { data, error } = await supabase.from('schools').select('id, name, aliases').order('name')
  return { data: data || [], error }
}

export async function adminAddSchool(name, aliases, password) {
  if (!supabase) return { error: new Error('Not configured') }
  const { error } = await supabase.rpc('admin_add_school', {
    p_name: name, p_aliases: aliases || [], p_password: (password || '').trim(),
  })
  return { error }
}

export async function adminDeleteSchool(id, password) {
  if (!supabase) return { error: new Error('Not configured') }
  const { error } = await supabase.rpc('admin_delete_school', { p_id: id, p_password: (password || '').trim() })
  return { error }
}

export async function adminSetSchool(name, school, password) {
  if (!supabase) return { error: new Error('Not configured') }
  const { error } = await supabase.rpc('admin_set_school', { p_name: name, p_school: school || '', p_password: (password || '').trim() })
  return { error }
}

// ---- suggestions / feedback ---------------------------------------------
export async function submitFeedback({ name, message }) {
  if (!supabase) return { error: new Error('Not configured') }
  const { error } = await supabase.from('feedback').insert({
    name: (name || '').trim().slice(0, 40) || null,
    message: (message || '').trim().slice(0, 2000),
  })
  return { error }
}

export async function adminListFeedback(password) {
  if (!supabase) return { data: [], error: new Error('Not configured') }
  const { data, error } = await supabase.rpc('admin_list_feedback', { p_password: (password || '').trim() })
  return { data: data || [], error }
}

export async function adminDeleteFeedback(id, password) {
  if (!supabase) return { error: new Error('Not configured') }
  const { error } = await supabase.rpc('admin_delete_feedback', { p_id: id, p_password: (password || '').trim() })
  return { error }
}

// ---- admin moderation (all server-verified) -----------------------------
export async function adminDeleteChallenge(id, password) {
  if (!supabase) return { error: new Error('Not configured') }
  const { error } = await supabase.rpc('admin_delete_challenge', { p_id: id, p_password: (password || '').trim() })
  return { error }
}

export async function adminDeleteScore(id, password) {
  if (!supabase) return { error: new Error('Not configured') }
  const { error } = await supabase.rpc('admin_delete_score', { p_id: id, p_password: (password || '').trim() })
  return { error }
}

// Remove every entry for a display name on one board (challengeId null = global).
export async function adminDeleteName(name, challengeId, password) {
  if (!supabase) return { error: new Error('Not configured') }
  const { error } = await supabase.rpc('admin_delete_name', {
    p_name: name,
    p_challenge_id: challengeId || null,
    p_password: (password || '').trim(),
  })
  return { error }
}

export async function adminAddScore({ displayName, score, challengeId, language, school }, password) {
  if (!supabase) return { error: new Error('Not configured') }
  const { error } = await supabase.rpc('admin_add_score', {
    p_display_name: displayName,
    p_score: score,
    p_challenge_id: challengeId || null,
    p_language: language || 'zulu',
    p_school: school || null,
    p_password: (password || '').trim(),
  })
  return { error }
}
