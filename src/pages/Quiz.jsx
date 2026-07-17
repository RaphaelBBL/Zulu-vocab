import { useState } from 'react'
import { useVocab } from '../context/VocabContext'
import { MODES, shuffle, buildQuestion, QuizRunner, Results, scoreFrom } from '../components/QuizEngine'

const QUESTIONS = 10

export default function Quiz({ go }) {
  const { words, categories, troubleWords, recordAnswer, completeQuiz } = useVocab()
  const [phase, setPhase] = useState('setup')
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
          : 'No words in this selection yet. Add some in the Words tab.'
      )
      return
    }
    const picked = shuffle(pool).slice(0, Math.min(QUESTIONS, pool.length))
    setQuestions(picked.map((w) => buildQuestion(w, mode, words)))
    setPhase('running')
    setResult(null)
  }

  function finish(answers) {
    completeQuiz()
    setResult(scoreFrom(answers))
    setPhase('done')
  }

  if (phase === 'running') {
    return (
      <QuizRunner
        questions={questions}
        onAnswer={(id, ok) => recordAnswer(id, ok)}
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
        onAgain={() => setPhase('setup')}
        onLeaderboard={() => go('leaderboard')}
      />
    )
  }

  return (
    <div>
      <h1 className="display">Quiz</h1>
      <p className="subtitle">Choose a mode and a list, then drill your words.</p>

      {troubleWords.length > 0 && (
        <button
          className="btn danger block mb"
          onClick={() => { setReviewMode(true); setCategory('all') }}
          style={reviewMode ? { background: '#fbeae6', borderColor: 'var(--terra)' } : {}}
        >
          Review my mistakes ({troubleWords.length} word{troubleWords.length !== 1 ? 's' : ''})
          {reviewMode ? ' — selected' : ''}
        </button>
      )}

      <h2>Mode</h2>
      <div className="grid cols-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={'select-card' + (mode === m.id ? ' on' : '')}
            onClick={() => setMode(m.id)}
          >
            <div className="select-title">{m.label}</div>
            <div className="small muted">{m.sub}</div>
          </button>
        ))}
      </div>

      {!reviewMode && (
        <>
          <h2>List</h2>
          <div className="chip-row mb">
            <span className={'chip' + (category === 'all' ? ' active' : '')} onClick={() => setCategory('all')}>
              Mixed (all)
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

      <button className="btn gold block mt" onClick={start}>Start quiz</button>
    </div>
  )
}
