import { useVocab } from '../context/VocabContext'
import ProgressBar from '../components/ProgressBar'

export default function Dashboard({ go }) {
  const {
    words,
    categories,
    progress,
    accuracy,
    masteryByCategory,
    troubleWords,
    displayName,
    language,
    languageTag,
  } = useVocab()

  const wordsPractised = Object.values(progress.wordStats).filter((s) => s.seen > 0).length
  const greeting = language === 'afrikaans' ? 'Hallo' : 'Sawubona'

  return (
    <div>
      <h1 className="display">{greeting}{displayName ? `, ${displayName}` : ''}.</h1>
      <p className="subtitle">Where your {languageTag} stands today.</p>

      <div className="grid cols-3 mb">
        <div className="card stat">
          <div className="num">{wordsPractised}</div>
          <div className="lbl">Words practised</div>
        </div>
        <div className="card stat gold">
          <div className="num">{progress.quizzesCompleted}</div>
          <div className="lbl">Quizzes done</div>
        </div>
        <div className="card stat">
          <div className="num">{accuracy}%</div>
          <div className="lbl">Accuracy</div>
        </div>
        <div className="card stat red">
          <div className="num">{progress.streak}</div>
          <div className="lbl">Day streak</div>
        </div>
        <div className="card stat">
          <div className="num">{words.length}</div>
          <div className="lbl">Words in library</div>
        </div>
        <div className="card stat gold">
          <div className="num">{progress.totalCorrect}</div>
          <div className="lbl">Correct answers</div>
        </div>
      </div>

      <div className="row mb" style={{ gap: 10 }}>
        <button className="btn gold spread" onClick={() => go('quiz')}>
          Start a quiz
        </button>
        {troubleWords.length > 0 && (
          <button className="btn danger spread" onClick={() => go('quiz')}>
            Review {troubleWords.length} mistake{troubleWords.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <h2>Mastery by category</h2>
      <div className="card">
        {categories.length === 0 && <div className="empty">No categories yet — add some in the Words tab.</div>}
        {categories.map((c) => {
          const m = masteryByCategory[c.id] || { pct: 0, total: 0, seen: 0 }
          return (
            <div key={c.id} style={{ padding: '10px 2px' }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 700 }}>
                  {c.emoji} {c.name}
                </span>
                <span className="small muted">
                  {m.pct}% · {m.seen}/{m.total} seen
                </span>
              </div>
              <ProgressBar pct={m.pct} gold={m.pct >= 80} />
            </div>
          )
        })}
      </div>

      <p className="center muted small mt" style={{ fontStyle: 'italic' }}>
        “Ukuqhubeka kuyimpumelelo” — persistence brings success.
      </p>
    </div>
  )
}
