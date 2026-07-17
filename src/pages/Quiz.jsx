import { useMemo, useState } from 'react'
import { useVocab } from '../context/VocabContext'
import { submitScore, isSupabaseConfigured } from '../lib/supabase'

const MODES = [
  { id: 'mc-ze', label: 'Multiple choice', sub: 'isiZulu → English', ico: '🇿🇦' },
  { id: 'mc-ez', label: 'Multiple choice', sub: 'English → isiZulu', ico: '🔤' },
  { id: 'type', label: 'Type the answer', sub: 'Spell the isiZulu word', ico: '⌨️' },
  { id: 'flash', label: 'Flashcards', sub: 'Flip & self-mark', ico: '🃏' },
]

const QUESTIONS = 10

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[.!?,;:]/g, '')
    .replace(/\s+/g, ' ')
}

// English answers can have several accepted forms ("to like / to love").
function acceptableAnswers(english) {
  return english
    .split(/\/|,| or /i)
    .map((s) => normalize(s.replace(/\(.*?\)/g, '')))
    .filter(Boolean)
}

export default function Quiz({ go }) {
  const { words, categories, troubleWords, recordAnswer, completeQuiz, displayName } = useVocab()
  const [phase, setPhase] = useState('setup') // setup | running | done
  const [mode, setMode] = useState('mc-ze')
  const [category, setCategory] = useState('all')
  const [reviewMode, setReviewMode] = useState(false)
  const [questions, setQuestions] = useState([])
  const [result, setResult] = useState(null)

  function buildPool() {
    if (reviewMode) return troubleWords
    if (category === 'all') return words
    return words.filter((w) => w.category === category)
  }

  function start() {
    const pool = buildPool()
    if (pool.length < (mode.startsWith('mc') ? 4 : 1)) {
      alert(
        mode.startsWith('mc')
          ? 'Need at least 4 words in this selection for multiple choice. Pick another list or add more words.'
          : 'No words in this selection yet. Add some in the Vocab tab.'
      )
      return
    }
    const picked = shuffle(pool).slice(0, Math.min(QUESTIONS, pool.length))
    const qs = picked.map((w) => buildQuestion(w, mode, words))
    setQuestions(qs)
    setPhase('running')
    setResult(null)
  }

  function finish(answers) {
    const correct = answers.filter((a) => a.correct).length
    const total = answers.length
    const accuracy = total ? Math.round((correct / total) * 100) : 0
    const perfect = correct === total && total > 0
    const score = correct * 10 + (perfect ? 25 : 0)
    completeQuiz()
    setResult({ correct, total, accuracy, score, perfect, answers })
    setPhase('done')
  }

  if (phase === 'running') {
    return (
      <QuizRunner
        questions={questions}
        mode={mode}
        onAnswer={(wordId, ok) => recordAnswer(wordId, ok)}
        onFinish={finish}
        onQuit={() => setPhase('setup')}
      />
    )
  }

  if (phase === 'done' && result) {
    return (
      <Results
        result={result}
        modeLabel={MODES.find((m) => m.id === mode)}
        category={reviewMode ? 'Mistakes review' : category === 'all' ? 'Mixed' : categories.find((c) => c.id === category)?.name}
        displayName={displayName}
        onAgain={() => setPhase('setup')}
        onLeaderboard={() => go('leaderboard')}
      />
    )
  }

  // ----- setup -----
  return (
    <div>
      <h1>Quiz time ✏️</h1>
      <p className="subtitle">Pick a mode and a list, then drill your words.</p>

      {troubleWords.length > 0 && (
        <button
          className={'btn danger block mb'}
          onClick={() => { setReviewMode(true); setCategory('all'); }}
          style={reviewMode ? { background: '#fdeeec', borderColor: 'var(--red)' } : {}}
        >
          🩹 Review my mistakes ({troubleWords.length} word{troubleWords.length !== 1 ? 's' : ''})
          {reviewMode ? ' — selected' : ''}
        </button>
      )}

      <h2>Mode</h2>
      <div className="grid cols-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            className="card"
            onClick={() => setMode(m.id)}
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              borderColor: mode === m.id ? 'var(--green)' : 'var(--border)',
              borderWidth: 2,
              background: mode === m.id ? '#eaf7ef' : '#fff',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>{m.ico}</div>
            <div style={{ fontWeight: 800 }}>{m.label}</div>
            <div className="small muted">{m.sub}</div>
          </button>
        ))}
      </div>

      {!reviewMode && (
        <>
          <h2>List</h2>
          <div className="chip-row mb">
            <span className={'chip' + (category === 'all' ? ' active' : '')} onClick={() => setCategory('all')}>
              🎲 Mixed (all)
            </span>
            {categories.map((c) => (
              <span key={c.id} className={'chip' + (category === c.id ? ' active' : '')} onClick={() => setCategory(c.id)}>
                {c.emoji} {c.name}
              </span>
            ))}
          </div>
        </>
      )}

      {reviewMode && (
        <div className="notice mb mt">
          Reviewing your {troubleWords.length} most-missed words.{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setReviewMode(false) }}>Quiz a normal list instead</a>
        </div>
      )}

      <button className="btn gold block mt" onClick={start}>Start quiz →</button>
    </div>
  )
}

// Build one question object for a word depending on mode.
function buildQuestion(word, mode, allWords) {
  if (mode === 'type') {
    return { type: 'type', word, prompt: word.english, promptSub: 'Type the isiZulu word', answer: word.isizulu }
  }
  if (mode === 'flash') {
    return { type: 'flash', word }
  }
  const zuToEn = mode === 'mc-ze'
  const promptText = zuToEn ? word.isizulu : word.english
  const correctText = zuToEn ? word.english : word.isizulu
  // distractors: other words, unique display text, prefer same category
  const sameCat = allWords.filter((w) => w.id !== word.id && w.category === word.category)
  const others = allWords.filter((w) => w.id !== word.id)
  const pickFrom = sameCat.length >= 3 ? sameCat : others
  const seen = new Set([correctText])
  const distractors = []
  for (const w of shuffle(pickFrom)) {
    const t = zuToEn ? w.english : w.isizulu
    if (seen.has(t)) continue
    seen.add(t)
    distractors.push(t)
    if (distractors.length === 3) break
  }
  const options = shuffle([correctText, ...distractors])
  return {
    type: 'mc',
    word,
    prompt: promptText,
    promptSub: zuToEn ? 'What does this mean in English?' : 'How do you say this in isiZulu?',
    options,
    answer: correctText,
    nounClass: zuToEn ? word.nounClass : null,
  }
}

// ---------- runner ----------
function QuizRunner({ questions, mode, onAnswer, onFinish, onQuit }) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [chosen, setChosen] = useState(null) // for MC
  const [typed, setTyped] = useState('')
  const [revealed, setRevealed] = useState(false) // type + flash
  const [flipped, setFlipped] = useState(false)

  const q = questions[idx]
  const isLast = idx === questions.length - 1

  function next(record) {
    onAnswer(q.word.id, record.correct)
    const nextAnswers = [...answers, record]
    setAnswers(nextAnswers)
    if (isLast) {
      onFinish(nextAnswers)
    } else {
      setIdx(idx + 1)
      setChosen(null); setTyped(''); setRevealed(false); setFlipped(false)
    }
  }

  // MC
  function chooseMC(opt) {
    if (chosen != null) return
    setChosen(opt)
    const correct = opt === q.answer
    setTimeout(() => next({ correct, word: q.word, given: opt, expected: q.answer }), 750)
  }

  // type
  function submitType(e) {
    e.preventDefault()
    if (revealed) return
    const ok = acceptableAnswers(q.answer).includes(normalize(typed)) || normalize(typed) === normalize(q.answer)
    setRevealed(ok ? 'ok' : 'bad')
    setTimeout(() => next({ correct: ok, word: q.word, given: typed, expected: q.answer }), ok ? 750 : 1400)
  }

  // flash
  function gradeFlash(ok) {
    next({ correct: ok, word: q.word, given: ok ? 'knew it' : 'missed', expected: q.word.english })
  }

  return (
    <div>
      <div className="row between mb">
        <button className="btn sm subtle" onClick={onQuit}>← Quit</button>
        <span className="small muted">Question {idx + 1} of {questions.length}</span>
      </div>

      <div className="progress-dots">
        {questions.map((_, i) => (
          <span key={i} className={'dot' + (i < answers.length ? (answers[i].correct ? ' right' : ' wrong') : '') + (i === idx ? ' current' : '')} />
        ))}
      </div>

      {q.type === 'mc' && (
        <div className="card quiz-card">
          <div className="prompt-sub">{q.promptSub}</div>
          <div className="prompt-word">
            {q.prompt} {q.nounClass && <span className="nc">class {q.nounClass}</span>}
          </div>
          <div className="options mt">
            {q.options.map((opt) => {
              let cls = 'option'
              if (chosen != null) {
                if (opt === q.answer) cls += ' correct'
                else if (opt === chosen) cls += ' wrong'
              }
              return (
                <button key={opt} className={cls} disabled={chosen != null} onClick={() => chooseMC(opt)}>
                  {opt}
                </button>
              )
            })}
          </div>
          {chosen != null && chosen !== q.answer && (
            <div className="feedback bad">Correct answer: <b>{q.answer}</b></div>
          )}
        </div>
      )}

      {q.type === 'type' && (
        <form className="card quiz-card" onSubmit={submitType}>
          <div className="prompt-sub">{q.promptSub}</div>
          <div className="prompt-word">{q.prompt}</div>
          <input
            autoFocus
            value={typed}
            disabled={!!revealed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type in isiZulu…"
            style={{ textAlign: 'center', fontSize: '1.1rem', marginTop: 10 }}
          />
          {!revealed && <button className="btn block mt" type="submit" disabled={!typed.trim()}>Check</button>}
          {revealed === 'ok' && <div className="feedback ok mt">✅ Yebo! Correct.</div>}
          {revealed === 'bad' && (
            <div className="feedback bad mt">❌ The answer is <b>{q.answer}</b></div>
          )}
        </form>
      )}

      {q.type === 'flash' && (
        <>
          <div className={'flash card' + (flipped ? ' flipped' : '')} onClick={() => setFlipped(!flipped)} style={{ padding: 0 }}>
            <div className="flash-inner">
              <div className="flash-face flash-front">
                <div className="prompt-sub">isiZulu</div>
                <div className="prompt-word">{q.word.isizulu}</div>
                {q.word.nounClass && <span className="nc">class {q.word.nounClass}</span>}
                <div className="small muted mt">Tap to flip 🔄</div>
              </div>
              <div className="flash-face flash-back">
                <div className="prompt-sub" style={{ color: '#dff5e8' }}>English</div>
                <div className="prompt-word" style={{ color: '#fff' }}>{q.word.english}</div>
                {q.word.example && <div className="small mt" style={{ opacity: 0.9 }}>{q.word.example}</div>}
              </div>
            </div>
          </div>
          <div className="row mt" style={{ gap: 10 }}>
            <button className="btn danger spread" onClick={() => gradeFlash(false)}>Missed it</button>
            <button className="btn spread" onClick={() => gradeFlash(true)}>Got it ✅</button>
          </div>
          <p className="center small muted mt">Flip the card, then mark whether you knew it.</p>
        </>
      )}
    </div>
  )
}

// ---------- results ----------
function Results({ result, modeLabel, category, displayName, onAgain, onLeaderboard }) {
  const { correct, total, accuracy, score, perfect, answers } = result
  const [name, setName] = useState(displayName || '')
  const { setDisplayName } = useVocab()
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const wrongs = answers.filter((a) => !a.correct)

  async function post() {
    if (!name.trim()) return
    setDisplayName(name)
    setStatus('sending')
    const { error } = await submitScore({
      displayName: name.trim(),
      score,
      quizMode: modeLabel ? `${modeLabel.label} (${modeLabel.sub})` : 'quiz',
      category,
      accuracy,
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <div>
      <h1 className="center">{perfect ? '🌟 Impela! Perfect!' : accuracy >= 60 ? '🎉 Well done!' : '💪 Keep practising!'}</h1>
      <div className="card center" style={{ padding: 24 }}>
        <div className="stat" style={{ padding: 0 }}>
          <div className="num" style={{ fontSize: '3rem' }}>{score}</div>
          <div className="lbl">points</div>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 24, marginTop: 14 }}>
          <div><b>{correct}/{total}</b><div className="small muted">correct</div></div>
          <div><b>{accuracy}%</b><div className="small muted">accuracy</div></div>
          <div><b>{category}</b><div className="small muted">list</div></div>
        </div>
      </div>

      {/* leaderboard submit */}
      <div className="card mt">
        <h2 style={{ marginTop: 0 }}>🏆 Post to the leaderboard</h2>
        {!isSupabaseConfigured ? (
          <div className="notice">
            The shared leaderboard isn't set up yet. Add your Supabase keys in
            <code> .env.local</code> to switch it on (see the README) — then your
            scores will sync with your friends.
          </div>
        ) : status === 'sent' ? (
          <div className="center">
            <p className="feedback ok">✅ Score posted as <b>{name}</b>!</p>
            <button className="btn block" onClick={onLeaderboard}>See the leaderboard →</button>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Display name</label>
              <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <button className="btn gold block" onClick={post} disabled={!name.trim() || status === 'sending'}>
              {status === 'sending' ? 'Posting…' : `Post ${score} points`}
            </button>
            {status === 'error' && <p className="feedback bad small mt">Couldn't reach the leaderboard. Check your connection / keys and try again.</p>}
          </>
        )}
      </div>

      {wrongs.length > 0 && (
        <>
          <h2>Words to review</h2>
          <div className="card" style={{ padding: 4 }}>
            {wrongs.map((a, i) => (
              <div className="word" key={i}>
                <div className="spread">
                  <span className="zu">{a.word.isizulu}</span>
                  <div className="en">{a.word.english}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="row mt" style={{ gap: 10 }}>
        <button className="btn subtle spread" onClick={onAgain}>← New quiz</button>
        <button className="btn spread" onClick={onLeaderboard}>Leaderboard 🏆</button>
      </div>
    </div>
  )
}
