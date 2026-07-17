import { useEffect, useState } from 'react'
import { fetchTopScores, isSupabaseConfigured } from '../lib/supabase'
import { useVocab } from '../context/VocabContext'

export default function Leaderboard() {
  const { displayName } = useVocab()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  async function loadScores() {
    setLoading(true)
    setError(false)
    const { data, error } = await fetchTopScores(50)
    if (error) setError(true)
    setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    if (isSupabaseConfigured) loadScores()
    else setLoading(false)
  }, [])

  // Find the best rank belonging to me (by display name).
  const myBestIndex = rows.findIndex(
    (r) => displayName && r.display_name.toLowerCase() === displayName.toLowerCase()
  )

  if (!isSupabaseConfigured) {
    return (
      <div>
        <h1>Leaderboard 🏆</h1>
        <div className="card">
          <div className="notice">
            <b>The shared leaderboard isn't connected yet.</b>
            <p>
              To let you and your friends compete across devices, this app needs a
              free Supabase backend. It takes about 3 minutes:
            </p>
            <ol className="small">
              <li>Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a>.</li>
              <li>Run the SQL in the README to create the <code>scores</code> table.</li>
              <li>Copy your Project URL + anon key into <code>.env.local</code>.</li>
              <li>Restart the dev server (or redeploy).</li>
            </ol>
            <p className="small">Full step-by-step is in the README under “Setting up the leaderboard”.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="row between">
        <h1>Leaderboard 🏆</h1>
        <button className="btn sm subtle" onClick={loadScores}>↻ Refresh</button>
      </div>
      <p className="subtitle">Top scores from everyone playing. Beat your classmates! 🇿🇦</p>

      {myBestIndex >= 0 && (
        <div className="card mb" style={{ background: '#fff8e6', borderColor: 'var(--ochre)' }}>
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
        <div className="empty">No scores yet — finish a quiz and be the first! 🥇</div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card" style={{ padding: 8 }}>
          {rows.map((r, i) => {
            const isMe = displayName && r.display_name.toLowerCase() === displayName.toLowerCase()
            return (
              <div key={r.id} className={'lb-row' + (isMe ? ' me' : '')}>
                <span className={'rank' + (i === 0 ? ' g1' : i === 1 ? ' g2' : i === 2 ? ' g3' : '')}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <div className="lb-name">
                  {r.display_name}{isMe ? ' (you)' : ''}
                  <div className="lb-meta">
                    {r.accuracy != null ? `${r.accuracy}% · ` : ''}{r.category || 'Mixed'}
                  </div>
                </div>
                <span className="lb-score">{r.score}</span>
              </div>
            )
          })}
        </div>
      )}

      <p className="center small muted mt">
        Scores sync for everyone with the app link. Play a quiz to post yours!
      </p>
    </div>
  )
}
