// Shared quiz engine used by both the normal Quiz tab and file Challenges.
import { useState } from 'react'
import { useVocab } from '../context/VocabContext'
import { submitScore, isSupabaseConfigured } from '../lib/supabase'

export const MODES = [
  { id: 'mc-ze', label: 'Multiple choice', sub: 'Word to English' },
  { id: 'mc-ez', label: 'Multiple choice', sub: 'English to word' },
  { id: 'type', label: 'Type the answer', sub: 'Spell the word' },
  { id: 'flash', label: 'Flashcards', sub: 'Flip and self-mark' },
]

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[.!?,;:]/g, '')
    .replace(/\s+/g, ' ')
}

export function acceptableAnswers(english) {
  return english
    .split(/\/|,| or /i)
    .map((s) => normalize(s.replace(/\(.*?\)/g, '')))
    .filter(Boolean)
}

// Build one question object for a word depending on mode.
export function buildQuestion(word, mode, allWords) {
  if (mode === 'type') {
    return { type: 'type', word, prompt: word.english, promptSub: 'Type the word', answer: word.isizulu }
  }
  if (mode === 'flash') {
    return { type: 'flash', word }
  }
  const zuToEn = mode === 'mc-ze'
  const promptText = zuToEn ? word.isizulu : word.english
  const correctText = zuToEn ? word.english : word.isizulu
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
    promptSub: zuToEn ? 'What does this mean in English?' : 'What is the word for this?',
    options,
    answer: correctText,
    nounClass: zuToEn ? word.nounClass : null,
  }
}

// ---------- runner ----------
export function QuizRunner({ questions, onAnswer, onFinish, onQuit }) {
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [chosen, setChosen] = useState(null)
  const [typed, setTyped] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [flipped, setFlipped] = useState(false)

  const q = questions[idx]
  const isLast = idx === questions.length - 1

  function next(record) {
    onAnswer(q.word.id, record.correct)
    const nextAnswers = [...answers, record]
    setAnswers(nextAnswers)
    if (isLast) onFinish(nextAnswers)
    else {
      setIdx(idx + 1)
      setChosen(null); setTyped(''); setRevealed(false); setFlipped(false)
    }
  }

  function chooseMC(opt) {
    if (chosen != null) return
    setChosen(opt)
    const correct = opt === q.answer
    setTimeout(() => next({ correct, word: q.word, given: opt, expected: q.answer }), 750)
  }

  function submitType(e) {
    e.preventDefault()
    if (revealed) return
    const ok = acceptableAnswers(q.answer).includes(normalize(typed)) || normalize(typed) === normalize(q.answer)
    setRevealed(ok ? 'ok' : 'bad')
    setTimeout(() => next({ correct: ok, word: q.word, given: typed, expected: q.answer }), ok ? 750 : 1400)
  }

  function gradeFlash(ok) {
    next({ correct: ok, word: q.word, given: ok ? 'knew it' : 'missed', expected: q.word.english })
  }

  return (
    <div>
      <div className="row between mb">
        <button className="btn sm subtle" onClick={onQuit}>Quit</button>
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
            placeholder="Type the word…"
            style={{ textAlign: 'center', fontSize: '1.1rem', marginTop: 10 }}
          />
          {!revealed && <button className="btn block mt" type="submit" disabled={!typed.trim()}>Check</button>}
          {revealed === 'ok' && <div className="feedback ok mt">Yebo — correct.</div>}
          {revealed === 'bad' && <div className="feedback bad mt">The answer is <b>{q.answer}</b></div>}
        </form>
      )}

      {q.type === 'flash' && (
        <>
          <div className={'flash card' + (flipped ? ' flipped' : '')} onClick={() => setFlipped(!flipped)} style={{ padding: 0 }}>
            <div className="flash-inner">
              <div className="flash-face flash-front">
                <div className="prompt-sub">Word</div>
                <div className="prompt-word">{q.word.isizulu}</div>
                {q.word.nounClass && <span className="nc">class {q.word.nounClass}</span>}
                <div className="small muted mt">Tap to flip</div>
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
            <button className="btn spread" onClick={() => gradeFlash(true)}>Got it</button>
          </div>
          <p className="center small muted mt">Flip the card, then mark whether you knew it.</p>
        </>
      )}
    </div>
  )
}

// ---------- results ----------
export function Results({ result, modeLabel, category, challengeId, challengeName, language, onAgain, onLeaderboard }) {
  const { correct, total, accuracy, score, perfect, answers } = result
  const { displayName, setDisplayName, language: appLanguage, school } = useVocab()
  const [name, setName] = useState(displayName || '')
  const [status, setStatus] = useState('idle')
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
      challengeId,
      language: language || appLanguage,
      school,
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <div>
      <h1 className="center display">{perfect ? 'Impela — perfect' : accuracy >= 60 ? 'Well done' : 'Keep practising'}</h1>
      <div className="card center" style={{ padding: 24 }}>
        <div className="stat" style={{ padding: 0 }}>
          <div className="num" style={{ fontSize: '3rem' }}>{score}</div>
          <div className="lbl">points</div>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 24, marginTop: 14 }}>
          <div><b>{correct}/{total}</b><div className="small muted">correct</div></div>
          <div><b>{accuracy}%</b><div className="small muted">accuracy</div></div>
          <div><b>{challengeName || category}</b><div className="small muted">{challengeName ? 'challenge' : 'list'}</div></div>
        </div>
      </div>

      <div className="card mt">
        <h2 style={{ marginTop: 0 }}>Post to the {challengeName ? 'challenge ' : ''}leaderboard</h2>
        {!isSupabaseConfigured ? (
          <div className="notice">
            The shared leaderboard isn't set up yet. Add your Supabase keys in
            <code> .env.local</code> to switch it on (see the README).
          </div>
        ) : status === 'sent' ? (
          <div className="center">
            <p className="feedback ok">Score posted as <b>{name}</b>.</p>
            <button className="btn block" onClick={onLeaderboard}>See the leaderboard</button>
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
            {status === 'error' && <p className="feedback bad small mt">Couldn't reach the leaderboard. Check your connection and try again.</p>}
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
        <button className="btn subtle spread" onClick={onAgain}>New quiz</button>
        <button className="btn spread" onClick={onLeaderboard}>Leaderboard</button>
      </div>
    </div>
  )
}

// Compute a score object from an answers array.
export function scoreFrom(answers) {
  const correct = answers.filter((a) => a.correct).length
  const total = answers.length
  const accuracy = total ? Math.round((correct / total) * 100) : 0
  const perfect = correct === total && total > 0
  const score = correct * 10 + (perfect ? 25 : 0)
  return { correct, total, accuracy, perfect, score, answers }
}
