import { useState } from 'react'
import { useVocab } from './context/VocabContext'
import Dashboard from './pages/Dashboard'
import Vocab from './pages/Vocab'
import Quiz from './pages/Quiz'
import Videos from './pages/Videos'
import Leaderboard from './pages/Leaderboard'
import NameModal from './components/NameModal'

const TABS = [
  { id: 'dashboard', label: 'Home', ico: '🏠' },
  { id: 'vocab', label: 'Vocab', ico: '📖' },
  { id: 'quiz', label: 'Quiz', ico: '✏️' },
  { id: 'videos', label: 'Videos', ico: '▶️' },
  { id: 'leaderboard', label: 'Ranks', ico: '🏆' },
]

export default function App() {
  const { displayName } = useVocab()
  const [tab, setTab] = useState('dashboard')
  const [showName, setShowName] = useState(false)
  // Ask for a name once, up front, so leaderboard scores have an owner.
  const [askedName, setAskedName] = useState(false)
  if (!displayName && !askedName) {
    // defer to a modal on first paint
    setTimeout(() => setShowName(true), 300)
    setAskedName(true)
  }

  // let quiz jump to leaderboard, dashboard jump to quiz, etc.
  const go = (t) => setTab(t)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🗣️</span>
          <span>
            Funda amaGama
            <small>Learn isiZulu words</small>
          </span>
        </div>
        <span className="spacer" />
        <button className="name-pill" onClick={() => setShowName(true)}>
          {displayName ? `👤 ${displayName}` : 'Set your name'}
        </button>
      </header>

      <main className="content">
        {tab === 'dashboard' && <Dashboard go={go} />}
        {tab === 'vocab' && <Vocab />}
        {tab === 'quiz' && <Quiz go={go} />}
        {tab === 'videos' && <Videos />}
        {tab === 'leaderboard' && <Leaderboard />}
      </main>

      <nav className="nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <span className="ico">{t.ico}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {showName && <NameModal onClose={() => setShowName(false)} />}
    </div>
  )
}
