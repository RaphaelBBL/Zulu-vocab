import { useEffect, useMemo, useState } from 'react'
import { useVocab } from '../context/VocabContext'
import {
  fetchChallenges, createChallenge, adminDeleteChallenge,
  verifyAdmin, isSupabaseConfigured,
} from '../lib/supabase'
import { pdfToText, extractPairs } from '../lib/extract'
import Leaderboard from './Leaderboard'
import { MODES, shuffle, buildQuestion, QuizRunner, Results, scoreFrom } from '../components/QuizEngine'

const QUESTIONS = 10

export default function Challenges() {
  const { recordAnswer, completeQuiz, isAdmin, adminPassword, language, languageTag } = useVocab()
  const [view, setView] = useState('list') // list | create | quiz | board
  const [allChallenges, setAllChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)

  // Only show challenges for the language the learner is currently in.
  const challenges = allChallenges.filter((c) => (c.language || 'zulu') === language)

  async function reload() {
    setLoading(true)
    const { data } = await fetchChallenges()
    setAllChallenges(data)
    setLoading(false)
  }
  useEffect(() => {
    if (isSupabaseConfigured) reload()
    else setLoading(false)
  }, [])

  async function onDelete(c) {
    if (!confirm(`Delete the “${c.name}” challenge and its leaderboard? This can't be undone.`)) return
    const { error } = await adminDeleteChallenge(c.id, adminPassword)
    if (error) alert('Could not delete: ' + error.message)
    else reload()
  }

  if (!isSupabaseConfigured) {
    return (
      <div>
        <h1 className="display">Challenges</h1>
        <div className="card"><div className="notice">
          Challenges are shared across everyone, so they need the Supabase backend
          connected first. See the README, then reload.
        </div></div>
      </div>
    )
  }

  if (view === 'create') {
    return <CreateChallenge onDone={() => { setView('list'); reload() }} onCancel={() => setView('list')} />
  }

  if (view === 'quiz' && active) {
    return <ChallengeQuiz challenge={active} recordAnswer={recordAnswer} completeQuiz={completeQuiz}
      onExit={() => setView('list')} onBoard={() => setView('board')} />
  }

  if (view === 'board' && active) {
    return (
      <div>
        <button className="btn sm subtle mb" onClick={() => setView('list')}>All challenges</button>
        <Leaderboard
          challengeId={active.id}
          language={active.language || 'zulu'}
          heading={active.name}
          subtitle={`Top scores for the “${active.name}” challenge.`}
        />
        <button className="btn gold block mt" onClick={() => setView('quiz')}>Take this challenge</button>
      </div>
    )
  }

  // ----- list view -----
  return (
    <div>
      <h1 className="display">Challenges</h1>
      <p className="subtitle">
        {languageTag} quiz sets made from real notes — each with its own
        leaderboard. Pick one and see where you land.
      </p>

      <AdminBar onCreate={() => setView('create')} />

      {loading && <div className="empty">Loading challenges…</div>}
      {!loading && challenges.length === 0 && <div className="empty">No challenges yet.</div>}

      <div className="grid mt">
        {challenges.map((c) => (
          <div className="card" key={c.id}>
            <div className="row between">
              <div>
                <div className="challenge-title">{c.name}</div>
                {c.description && <div className="small muted">{c.description}</div>}
                <div className="small muted mt">{(c.words || []).length} words</div>
              </div>
              {isAdmin && (
                <button className="icon-btn" title="Delete challenge (admin)" onClick={() => onDelete(c)}>✕</button>
              )}
            </div>
            <div className="row mt" style={{ gap: 8 }}>
              <button className="btn spread" onClick={() => { setActive(c); setView('quiz') }}>Take challenge</button>
              <button className="btn subtle spread" onClick={() => { setActive(c); setView('board') }}>Leaderboard</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- admin unlock bar (server-verified password) ----------
function AdminBar({ onCreate }) {
  const { isAdmin, setAdminPassword, clearAdmin } = useVocab()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [wrong, setWrong] = useState(false)

  if (isAdmin) {
    return (
      <div className="row between owner-bar mb">
        <span className="small">Admin mode — you can add and remove challenges, and moderate the leaderboards.</span>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm" onClick={onCreate}>Add notes file</button>
          <button className="btn sm subtle" onClick={clearAdmin}>Lock</button>
        </div>
      </div>
    )
  }

  async function tryUnlock() {
    setBusy(true); setWrong(false)
    const ok = await verifyAdmin(pw)
    setBusy(false)
    if (ok) setAdminPassword(pw.trim())
    else setWrong(true)
  }

  return (
    <div className="mb">
      {!open ? (
        <button className="btn sm subtle" onClick={() => setOpen(true)}>Admin sign in</button>
      ) : (
        <div className="card">
          <label>Admin password</label>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="spread" type="password" value={pw}
              onChange={(e) => { setPw(e.target.value); setWrong(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') tryUnlock() }}
              placeholder="Enter admin password"
            />
            <button className="btn" onClick={tryUnlock} disabled={busy || !pw.trim()}>
              {busy ? '…' : 'Unlock'}
            </button>
          </div>
          {wrong && <p className="feedback bad small mt">That password isn't right.</p>}
        </div>
      )}
    </div>
  )
}

// ---------- create challenge (upload -> extract -> review -> publish) ----------
function CreateChallenge({ onDone, onCancel }) {
  const { adminPassword, language } = useVocab()
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [publishing, setPublishing] = useState(false)

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setNote('')
    try {
      let raw = ''
      if (file.name.toLowerCase().endsWith('.pdf')) raw = await pdfToText(file)
      else raw = await file.text()
      if (!raw.trim()) setNote('No readable text found. If it’s a scanned/photo PDF, paste the text below instead.')
      else {
        applyText(raw)
        if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
      }
    } catch (err) {
      setNote('Could not read that file. Try pasting the text instead. (' + err.message + ')')
    }
    setBusy(false)
  }

  function applyText(raw) {
    const pairs = extractPairs(raw)
    setRows(pairs)
    setNote(pairs.length ? `Found ${pairs.length} candidate word${pairs.length !== 1 ? 's' : ''} — review and fix below.` : 'No word pairs detected. Check the format (e.g. “umama – mother” per line).')
  }

  function updateRow(i, patch) { setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))) }
  function removeRow(i) { setRows((prev) => prev.filter((_, idx) => idx !== i)) }
  function addRow() { setRows((prev) => [...prev, { isizulu: '', english: '' }]) }
  function swapAll() { setRows((prev) => prev.map((r) => ({ isizulu: r.english, english: r.isizulu }))) }

  const valid = useMemo(() => rows.filter((r) => r.isizulu.trim() && r.english.trim()), [rows])

  async function publish() {
    if (!name.trim() || valid.length < 4) return
    setPublishing(true)
    const words = valid.map((r) => ({ isizulu: r.isizulu.trim(), english: r.english.trim() }))
    const { error } = await createChallenge({ name: name.trim(), description: description.trim(), words, password: adminPassword, language })
    setPublishing(false)
    if (error) { setNote('Could not publish: ' + error.message); return }
    onDone()
  }

  return (
    <div>
      <button className="btn sm subtle mb" onClick={onCancel}>Cancel</button>
      <h1 className="display">New challenge from notes</h1>
      <p className="subtitle">
        Upload a PDF of your isiZulu notes (or paste the text). The app pulls out
        likely word pairs; you review them before it goes live for everyone.
      </p>

      <div className="card mb">
        <label>Upload notes (PDF or .txt)</label>
        <input type="file" accept=".pdf,.txt,text/plain" onChange={onFile} disabled={busy} />
        <div className="or">or</div>
        <label>Paste notes text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'umama – mother\nubaba – father\nisikole – school'}
          style={{ minHeight: 110 }}
        />
        <button className="btn subtle sm mt" disabled={!text.trim()} onClick={() => applyText(text)}>Extract from pasted text</button>
        {busy && <p className="small muted mt">Reading file…</p>}
        {note && <div className="notice mt">{note}</div>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="row between">
            <h2>Review words ({valid.length} valid)</h2>
            <button className="btn sm subtle" onClick={swapAll} title="Swap the isiZulu and English columns">Swap columns</button>
          </div>
          <div className="card" style={{ padding: 8 }}>
            <div className="review-head"><span>isiZulu</span><span>English</span><span></span></div>
            {rows.map((r, i) => (
              <div className="review-row" key={i}>
                <input value={r.isizulu} onChange={(e) => updateRow(i, { isizulu: e.target.value })} placeholder="isiZulu" />
                <input value={r.english} onChange={(e) => updateRow(i, { english: e.target.value })} placeholder="English" />
                <button className="icon-btn" onClick={() => removeRow(i)} title="Remove">✕</button>
              </div>
            ))}
            <button className="btn sm subtle mt" onClick={addRow}>+ Add a row</button>
          </div>

          <div className="card mt">
            <div className="field">
              <label>Challenge name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Term 3 vocab notes" maxLength={60} />
            </div>
            <div className="field">
              <label>Short description (optional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. From Mrs Dlamini’s handout" />
            </div>
            {valid.length < 4 && <p className="small muted">Add at least 4 valid words to publish.</p>}
            <button className="btn gold block" disabled={!name.trim() || valid.length < 4 || publishing} onClick={publish}>
              {publishing ? 'Publishing…' : `Publish challenge (${valid.length} words)`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ---------- challenge quiz ----------
function ChallengeQuiz({ challenge, recordAnswer, completeQuiz, onExit, onBoard }) {
  const [phase, setPhase] = useState('setup')
  const [mode, setMode] = useState('mc-ze')
  const [questions, setQuestions] = useState([])
  const [result, setResult] = useState(null)

  const words = useMemo(
    () => (challenge.words || []).map((w, i) => ({ id: `ch-${challenge.id}-${i}`, category: 'challenge', ...w })),
    [challenge]
  )

  function start() {
    if (mode.startsWith('mc') && words.length < 4) {
      alert('This challenge needs at least 4 words for multiple choice. Try flashcards or typing.')
      return
    }
    const picked = shuffle(words).slice(0, Math.min(QUESTIONS, words.length))
    setQuestions(picked.map((w) => buildQuestion(w, mode, words)))
    setPhase('running')
  }

  function finish(answers) {
    completeQuiz()
    setResult(scoreFrom(answers))
    setPhase('done')
  }

  if (phase === 'running') {
    return <QuizRunner questions={questions} onAnswer={recordAnswer} onFinish={finish} onQuit={() => setPhase('setup')} />
  }

  if (phase === 'done' && result) {
    return (
      <Results
        result={result}
        modeLabel={MODES.find((m) => m.id === mode)}
        category={challenge.name}
        challengeId={challenge.id}
        challengeName={challenge.name}
        language={challenge.language || 'zulu'}
        onAgain={() => setPhase('setup')}
        onLeaderboard={onBoard}
      />
    )
  }

  return (
    <div>
      <button className="btn sm subtle mb" onClick={onExit}>All challenges</button>
      <h1 className="display">{challenge.name}</h1>
      <p className="subtitle">{challenge.description || `${words.length} words`} · this challenge has its own leaderboard.</p>

      <h2>Mode</h2>
      <div className="grid cols-2">
        {MODES.map((m) => (
          <button key={m.id} className={'select-card' + (mode === m.id ? ' on' : '')} onClick={() => setMode(m.id)}>
            <div className="select-title">{m.label}</div>
            <div className="small muted">{m.sub}</div>
          </button>
        ))}
      </div>

      <button className="btn gold block mt" onClick={start}>Start challenge</button>
    </div>
  )
}
