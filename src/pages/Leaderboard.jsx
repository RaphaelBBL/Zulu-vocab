import { useEffect, useMemo, useState } from 'react'
import {
  fetchTopScores, isSupabaseConfigured,
  adminDeleteName, adminDeleteScore, adminAddScore,
} from '../lib/supabase'
import { sameSchool } from '../lib/schools'
import { useVocab } from '../context/VocabContext'

const RANK_MODES = [
  { id: 'total', label: 'Total', hint: 'All points added up' },
  { id: 'top', label: 'Top each', hint: 'Everyone’s best score, once' },
  { id: 'best', label: 'Best runs', hint: 'Every single quiz run' },
]
const SCOPES = [{ id: 'zulu', label: 'isiZulu' }, { id: 'afrikaans', label: 'Afrikaans' }, { id: 'combined', label: 'Combined' }]
const BOARDS = [{ id: 'everyone', label: 'Everyone' }, { id: 'school', label: 'My school' }, { id: 'schools', label: 'Schools' }]

const metaOf = (r) => `${r.accuracy != null ? r.accuracy + '% · ' : ''}${r.school || r.category || 'Mixed'}`

function computePeople(raw, mode) {
  if (mode === 'best') {
    return [...raw].sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at))
      .map((r) => ({ key: r.id, id: r.id, name: r.display_name, score: r.score, meta: metaOf(r) }))
  }
  const map = new Map()
  for (const r of raw) {
    const k = r.display_name.toLowerCase()
    const e = map.get(k) || { name: r.display_name, total: 0, count: 0, best: -1, bestMeta: '' }
    e.total += r.score; e.count += 1
    if (r.score > e.best) { e.best = r.score; e.bestMeta = metaOf(r); e.name = r.display_name }
    map.set(k, e)
  }
  const arr = [...map.values()]
  if (mode === 'top') return arr.sort((a, b) => b.best - a.best).map((e) => ({ key: e.name.toLowerCase(), name: e.name, score: e.best, meta: e.bestMeta }))
  return arr.sort((a, b) => b.total - a.total).map((e) => ({ key: e.name.toLowerCase(), name: e.name, score: e.total, meta: `${e.count} quiz${e.count !== 1 ? 'zes' : ''}` }))
}

function computeSchools(raw) {
  const map = new Map()
  for (const r of raw) {
    const sc = (r.school || '').trim()
    if (!sc) continue
    const k = sc.toLowerCase()
    const e = map.get(k) || { name: sc, total: 0, players: new Set() }
    e.total += r.score; e.players.add(r.display_name.toLowerCase())
    map.set(k, e)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
    .map((e) => ({ key: e.name.toLowerCase(), name: e.name, score: e.total, meta: `${e.players.size} player${e.players.size !== 1 ? 's' : ''}` }))
}

export default function Leaderboard({ challengeId = null, heading, subtitle, language }) {
  const { displayName, school: mySchool, isAdmin, adminPassword, language: appLanguage } = useVocab()
  const isGlobal = !challengeId
  const [scope, setScope] = useState(appLanguage)
  const [board, setBoard] = useState('everyone')
  const [mode, setMode] = useState('total')
  const [raw, setRaw] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAward, setShowAward] = useState(false)

  const filterLang = isGlobal ? (scope === 'combined' ? null : scope) : null
  const awardLang = isGlobal ? (scope === 'combined' ? appLanguage : scope) : (language || 'zulu')
  const isSchoolsBoard = isGlobal && board === 'schools'

  async function loadScores() {
    setLoading(true); setError(false)
    const { data, error } = await fetchTopScores(1000, challengeId, filterLang)
    if (error) setError(true)
    setRaw(data); setLoading(false)
  }
  useEffect(() => { if (isSupabaseConfigured) loadScores(); else setLoading(false) }, [challengeId, scope])

  const rows = useMemo(() => {
    if (isSchoolsBoard) return computeSchools(raw)
    let src = raw
    if (isGlobal && board === 'school') src = raw.filter((r) => sameSchool(r.school, mySchool))
    return computePeople(src, mode)
  }, [raw, mode, board, isSchoolsBoard, mySchool, isGlobal])

  async function onRemove(row) {
    if (mode === 'best' && !isSchoolsBoard) {
      if (!confirm(`Delete this single run (${row.name}, ${row.score} pts)?`)) return
      const { error } = await adminDeleteScore(row.id, adminPassword)
      if (error) alert('Could not delete: ' + error.message); else loadScores()
    } else {
      if (!confirm(`Remove "${row.name}" completely from this board?`)) return
      const { error } = await adminDeleteName(row.name, challengeId, adminPassword)
      if (error) alert('Could not remove: ' + error.message); else loadScores()
    }
  }

  const myIndex = rows.findIndex((r) => displayName && r.name.toLowerCase() === displayName.toLowerCase())

  if (!isSupabaseConfigured) {
    return (
      <div>
        <h1 className="display">{heading || 'Leaderboard'}</h1>
        <div className="card"><div className="notice"><b>The leaderboard isn't connected yet.</b> See the README.</div></div>
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

      {isGlobal && (
        <div className="scope-tabs mb">
          {BOARDS.map((b) => (
            <button key={b.id} className={'scope-tab' + (board === b.id ? ' on' : '')} onClick={() => setBoard(b.id)}>{b.label}</button>
          ))}
        </div>
      )}

      {isGlobal && (
        <div className="chip-row mb">
          {SCOPES.map((s) => (
            <span key={s.id} className={'chip' + (scope === s.id ? ' active' : '')} onClick={() => setScope(s.id)}>{s.label}</span>
          ))}
        </div>
      )}

      {!isSchoolsBoard && (
        <>
          <div className="chip-row mb">
            {RANK_MODES.map((m) => (
              <span key={m.id} className={'chip' + (mode === m.id ? ' active' : '')} onClick={() => setMode(m.id)}>{m.label}</span>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: -6 }}>{activeMode.hint}{isGlobal && scope === 'combined' ? ', across both languages' : ''}.</p>
        </>
      )}
      {isSchoolsBoard && <p className="small muted">Schools ranked by their players' total points.</p>}

      {isGlobal && board === 'school' && !mySchool && (
        <div className="notice mb">You haven't set a school yet — tap your name (top right) to add one, then your school board will appear here.</div>
      )}

      {isAdmin && !isSchoolsBoard && (
        <div className="owner-bar mb">
          <div className="row between">
            <span className="small">Admin: {mode === 'best' ? 'delete a single run' : 'remove a person'} with ✕, or award points.</span>
            <button className="btn sm" onClick={() => setShowAward((s) => !s)}>{showAward ? 'Close' : 'Award points'}</button>
          </div>
          {showAward && <AwardForm challengeId={challengeId} language={awardLang} school={isGlobal && board === 'school' ? mySchool : ''} password={adminPassword} onDone={() => { setShowAward(false); loadScores() }} />}
        </div>
      )}

      {myIndex >= 0 && !isSchoolsBoard && (
        <div className="card mb" style={{ background: 'var(--paper-2)', borderColor: 'var(--gold)' }}>
          <div className="row between">
            <span>Your rank ({activeMode.label.toLowerCase()})</span>
            <b style={{ fontSize: '1.2rem', color: 'var(--green)' }}>#{myIndex + 1} · {rows[myIndex].score} pts</b>
          </div>
        </div>
      )}

      {loading && <div className="empty">Loading scores…</div>}
      {error && <div className="notice">Couldn't load the leaderboard. Tap Refresh.</div>}
      {!loading && !error && rows.length === 0 && <div className="empty">No scores yet — finish a quiz and be the first.</div>}

      {!loading && rows.length > 0 && (
        <div className="card" style={{ padding: 8 }}>
          {rows.map((r, i) => {
            const isMe = !isSchoolsBoard && displayName && r.name.toLowerCase() === displayName.toLowerCase()
            const isMySchoolRow = isSchoolsBoard && sameSchool(r.name, mySchool)
            return (
              <div key={r.key} className={'lb-row' + (isMe || isMySchoolRow ? ' me' : '')}>
                <span className={'rank' + (i === 0 ? ' g1' : i === 1 ? ' g2' : i === 2 ? ' g3' : '')}>{i + 1}</span>
                <div className="lb-name">
                  {isSchoolsBoard ? '🏫 ' : ''}{r.name}{isMe ? ' (you)' : ''}
                  <div className="lb-meta">{r.meta}</div>
                </div>
                <span className="lb-score">{r.score}</span>
                {isAdmin && !isSchoolsBoard && <button className="icon-btn" title={mode === 'best' ? 'Delete this run' : 'Remove person'} onClick={() => onRemove(r)}>✕</button>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AwardForm({ challengeId, language, school, password, onDone }) {
  const [name, setName] = useState('')
  const [points, setPoints] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    const score = parseInt(points, 10)
    if (!name.trim() || isNaN(score)) { setErr('Enter a name and a number of points.'); return }
    setBusy(true); setErr('')
    const { error } = await adminAddScore({ displayName: name.trim(), score, challengeId, language, school }, password)
    setBusy(false)
    if (error) setErr('Could not award: ' + error.message); else onDone()
  }

  return (
    <div className="mt" style={{ display: 'grid', gap: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <input className="spread" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
        <input style={{ maxWidth: 110 }} type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Points" />
      </div>
      <button className="btn sm gold" onClick={submit} disabled={busy}>{busy ? 'Awarding…' : `Award points (${language})`}</button>
      {err && <p className="feedback bad small">{err}</p>}
    </div>
  )
}
