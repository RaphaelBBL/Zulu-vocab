import { useState } from 'react'
import { useVocab, LANGUAGES } from './context/VocabContext'
import Dashboard from './pages/Dashboard'
import Vocab from './pages/Vocab'
import Quiz from './pages/Quiz'
import Challenges from './pages/Challenges'
import Videos from './pages/Videos'
import Leaderboard from './pages/Leaderboard'
import NameModal from './components/NameModal'
import Footer from './components/Footer'

const TABS = [
  { id: 'dashboard', label: 'Home', ico: 'home' },
  { id: 'vocab', label: 'Words', ico: 'book' },
  { id: 'quiz', label: 'Quiz', ico: 'pencil' },
  { id: 'challenges', label: 'Files', ico: 'file' },
  { id: 'videos', label: 'Videos', ico: 'play' },
  { id: 'leaderboard', label: 'Ranks', ico: 'trophy' },
]

const ICON = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  book: 'M4 5a2 2 0 012-2h11v16H6a2 2 0 00-2 2V5zM17 3v16',
  pencil: 'M4 20l4-1L19 8a2 2 0 00-3-3L5 16l-1 4z',
  file: 'M6 2h8l4 4v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zM14 2v4h4',
  play: 'M4 4h16v12H4zM10 8l5 3-5 3V8zM8 20h8',
  trophy: 'M7 4h10v3a5 5 0 01-10 0V4zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M9 15h6l1 5H8z',
}

function TabIcon({ name }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON[name]} />
    </svg>
  )
}

export default function App() {
  const { displayName, language, setLanguage } = useVocab()
  const [tab, setTab] = useState('dashboard')
  const [showName, setShowName] = useState(false)
  const [askedName, setAskedName] = useState(false)
  if (!displayName && !askedName) {
    setTimeout(() => setShowName(true), 300)
    setAskedName(true)
  }

  const go = (t) => setTab(t)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">FG</span>
          <span className="brand-text">
            Funda amaGama
            <small>vocabulary, one word at a time</small>
          </span>
        </div>
        <span className="spacer" />
        <button className="name-pill" onClick={() => setShowName(true)}>
          {displayName ? displayName : 'Set your name'}
        </button>
      </header>

      <div className="lang-switch">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            className={'lang-btn' + (language === l.id ? ' on' : '')}
            onClick={() => setLanguage(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <main className="content">
        {tab === 'dashboard' && <Dashboard go={go} />}
        {tab === 'vocab' && <Vocab />}
        {tab === 'quiz' && <Quiz go={go} />}
        {tab === 'challenges' && <Challenges />}
        {tab === 'videos' && <Videos />}
        {tab === 'leaderboard' && <Leaderboard />}
        <Footer />
      </main>

      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <TabIcon name={t.ico} />
            {t.label}
          </button>
        ))}
      </nav>

      {showName && <NameModal onClose={() => setShowName(false)} />}
    </div>
  )
}
