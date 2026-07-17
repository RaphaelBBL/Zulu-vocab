import { useEffect, useState } from 'react'
import {
  fetchTopScores, isSupabaseConfigured,
  adminDeleteScore, adminAddScore,
} from '../lib/supabase'
import { useVocab } from '../context/VocabContext'

// Reusable board. Pass a challengeId + heading for a per-file leaderboard;
// omit them for the main global board.
export default function Leaderboard({ challengeId = null, heading, subtitle }) {
  const { displayName, isAdmin, adminPassword } = useVocab()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAward, setShowAward] = useState(false)

  async function loadScores() {
    setLoading(true)
    setError(false)
    const { data, error } = await fetchTopScores(50, challengeId)
    if (error) setError(true)
    setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    if (isSupabaseConfigured) loadScores()
    else setLoading(false)
  }, [challengeId])

  async function onDeleteRow(r) {
    if (!confirm(`Remove "${r.display_name}" (${r.score} pts) from the leaderboard?`)) return
    const { error } = await adminDeleteScore(r.id, adminPassword)
    if (error) alert('Could not remove: ' + error.message)
    else loadScores()
  }

  const myBestIndex = rows.findIndex(
    (r) => displayName && r.display_name.toLowerCase() === displayName.toLowerCase()
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

  return (
    <div>
      <div className="row between">
        <h1 className="display">{heading || 'Leaderboard'}</h1>
        <button className="btn sm subtle" onClick={loadScores}>Refresh</button>
      </div>
      <p className="subtitle">{subtitle || 'Top scores from everyone playing. Beat your classmates.'}</p>

      {isAdmin && (
        <div className="owner-bar mb">
          <div className="row between">
            <span className="small">Admin: remove entries with the ✕, or award points.</span>
            <button className="btn sm" onClick={() => setShowAward((s) => !s)}>
              {showAward ? 'Close' : 'Award points'}
            </button>
          </div>
          {showAward && <AwardForm challengeId={challengeId} password={adminPassword} onDone={() => { setShowAward(false); loadScores() }} />}
        </div>
      )}

      {myBestIndex >= 0 && (
        <div className="card mb" style={{ background: 'var(--paper-2)', borderColor: 'var(--gold)' }}>
          <div className="row between">
            <span>Your best rank</span>
            <b style={{ fontSize: '1.2rem', color: 'var(--green)' }}>
              #{myBestIndex + 1} · {rows[myBestIndex].score} pts
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
            const isMe = displayName && r.display_name.toLowerCase() === displayName.toLowerCase()
            return (
              <div key={r.id} className={'lb-row' + (isMe ? ' me' : '')}>
                <span className={'rank' + (i === 0 ? ' g1' : i === 1 ? ' g2' : i === 2 ? ' g3' : '')}>
                  {i + 1}
                </span>
                <div className="lb-name">
                  {r.display_name}{isMe ? ' (you)' : ''}
                  <div className="lb-meta">
                    {r.accuracy != null ? `${r.accuracy}% · ` : ''}{r.category || 'Mixed'}
                  </div>
                </div>
                <span className="lb-score">{r.score}</span>
                {isAdmin && (
                  <button className="icon-btn" title="Remove entry (admin)" onClick={() => onDeleteRow(r)}>✕</button>
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
