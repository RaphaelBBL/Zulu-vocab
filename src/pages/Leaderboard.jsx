import { useEffect, useMemo, useState } from 'react'
import {
  fetchTopScores, isSupabaseConfigured,
  adminDeleteName, adminAddScore,
} from '../lib/supabase'
import { useVocab } from '../context/VocabContext'

const RANK_MODES = [
  { id: 'total', label: 'Total', hint: 'All points added up' },
  { id: 'top', label: 'Top each', hint: 'Everyone’s best score, once' },
  { id: 'best', label: 'Best runs', hint: 'Every single quiz run' },
]

function metaOf(r) {
  return `${r.accuracy != null ? r.accuracy + '% · ' : ''}${r.category || 'Mixed'}`
}

// Build the ranked rows for a given mode from the raw score rows.
function computeView(raw, mode) {
  if (mode === 'best') {
    return [...raw]
      .sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at))
      .map((r) => ({ key: r.id, name: r.display_name, score: r.score, meta: metaOf(r) }))
  }
  const map = new Map()
  for (const r of raw) {
    const k = r.display_name.toLowerCase()
    const e = map.get(k) || { name: r.display_name, total: 0, count: 0, best: -1, bestMeta: '' }
    e.total += r.score
    e.count += 1
    if (r.score > e.best) { e.best = r.score; e.bestMeta = metaOf(r); e.name = r.display_name }
    map.set(k, e)
  }
  const arr = [...map.values()]
  if (mode === 'top') {
    return arr
      .sort((a, b) => b.best - a.best)
      .map((e) => ({ key: e.name.toLowerCase(), name: e.name, score: e.best, meta: e.bestMeta }))
  }
  // total
  return arr
    .sort((a, b) => b.total - a.total)
    .map((e) => ({ key: e.name.toLowerCase(), name: e.name, score: e.total, meta: `${e.count} quiz${e.count !== 1 ? 'zes' : ''}` }))
}

export default function Leaderboard({ challengeId = null, heading, subtitle }) {
  const { displayName, isAdmin, adminPassword } = useVocab()
  const [raw, setRaw] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [mode, setMode] = useState('total')
  const [showAward, setShowAward] = useState(false)

  async function loadScores() {
    setLoading(true)
    setError(false)
    const { data, error } = await fetchTopScores(1000, challengeId)
    if (error) setError(true)
    setRaw(data)
    setLoading(false)
  }

  useEffect(() => {
    if (isSupabaseConfigured) loadScores()
    else setLoading(false)
  }, [challengeId])

  const rows = useMemo(() => computeView(raw, mode), [raw, mode])

  async function onRemove(name) {
    if (!confirm(`Remove "${name}" completely from this leaderboard (all their entries)?`)) return
    const { error } = await adminDeleteName(name, challengeId, adminPassword)
    if (error) alert('Could not remove: ' + error.message)
    else loadScores()
  }

  const myIndex = rows.findIndex(
    (r) => displayName && r.name.toLowerCase() === displayName.toLowerCase()
  )

  if (!isSupabaseConfigured) {
    return (
      <div>
        <h1 className="display">{heading || 'Leaderboard'}</h1>
        <div className="card">
          <div className="notice">
            <b>The shared leaderboard isn't connected yet.</b>
            <p>To let you and your friends compete across devices, this app needs a free Supabase backend (about 3 minutes):</p>
            <ol className="small">
              <li>Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.</li>
              <li>Run the SQL in the README to create the tables.</li>
              <li>Copy your Project URL + anon key into <code>.env.local</code>.</li>
              <li>Restart the dev server (or redeploy).</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  const activeMode = RANK_MODES.find((m) => m.id === mode)

  return (
    <div>
      <div className="row between">
        <h1 className="display">{heading || 'Leaderboard'}</h1>
        <button className="btn sm subtle" onClick={loadScores}>Refresh</button>
      </div>
      <p className="subtitle">{subtitle || 'Top scores from everyone playing. Beat your classmates.'}</p>

      <div className="chip-row mb">
        {RANK_MODES.map((m) => (
          <span key={m.id} className={'chip' + (mode === m.id ? ' active' : '')} onClick={() => setMode(m.id)}>
            {m.label}
          </span>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: -6 }}>{activeMode.hint}.</p>

      {isAdmin && (
        <div className="owner-bar mb">
          <div className="row between">
            <span className="small">Admin: remove a name with ✕, or award points.</span>
            <button className="btn sm" onClick={() => setShowAward((s) => !s)}>
              {showAward ? 'Close' : 'Award points'}
            </button>
          </div>
          {showAward && <AwardForm challengeId={challengeId} password={adminPassword} onDone={() => { setShowAward(false); loadScores() }} />}
        </div>
      )}

      {myIndex >= 0 && (
        <div className="card mb" style={{ background: 'var(--paper-2)', borderColor: 'var(--gold)' }}>
          <div className="row between">
            <span>Your rank ({activeMode.label.toLowerCase()})</span>
            <b style={{ fontSize: '1.2rem', color: 'var(--green)' }}>
              #{myIndex + 1} · {rows[myIndex].score} pts
            </b>
          </div>
        </div>
      )}

      {loading && <div className="empty">Loading scores…</div>}
      {error && <div className="notice">Couldn't load the leaderboard. Check your connection and tap Refresh.</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="empty">No scores yet — finish a quiz and be the first.</div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card" style={{ padding: 8 }}>
          {rows.map((r, i) => {
            const isMe = displayName && r.name.toLowerCase() === displayName.toLowerCase()
            return (
              <div key={r.key} className={'lb-row' + (isMe ? ' me' : '')}>
                <span className={'rank' + (i === 0 ? ' g1' : i === 1 ? ' g2' : i === 2 ? ' g3' : '')}>
                  {i + 1}
                </span>
                <div className="lb-name">
                  {r.name}{isMe ? ' (you)' : ''}
                  <div className="lb-meta">{r.meta}</div>
                </div>
                <span className="lb-score">{r.score}</span>
                {isAdmin && (
                  <button className="icon-btn" title="Remove this name (admin)" onClick={() => onRemove(r.name)}>✕</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AwardForm({ challengeId, password, onDone }) {
  const [name, setName] = useState('')
  const [points, setPoints] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    const score = parseInt(points, 10)
    if (!name.trim() || isNaN(score)) { setErr('Enter a name and a number of points.'); return }
    setBusy(true); setErr('')
    const { error } = await adminAddScore({ displayName: name.trim(), score, challengeId }, password)
    setBusy(false)
    if (error) setErr('Could not award: ' + error.message)
    else onDone()
  }

  return (
    <div className="mt" style={{ display: 'grid', gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <input className="spread" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
        <input style={{ maxWidth: 110 }} type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Points" />
      </div>
      <button className="btn sm gold" onClick={submit} disabled={busy}>{busy ? 'Awarding…' : 'Award points'}</button>
      {err && <p className="feedback bad small">{err}</p>}
    </div>
  )
}
