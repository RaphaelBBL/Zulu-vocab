import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { load, save, uid } from '../lib/storage'
import { SEED_CATEGORIES, SEED_WORDS } from '../data/seedVocab'
import { SEED_VIDEOS } from '../data/seedVideos'

const VocabContext = createContext(null)

// ---- initial hydration helpers ----------------------------------------

function initWords() {
  const stored = load('words', null)
  if (stored) return stored
  // First run: copy the curated seed set into the user's editable store.
  return SEED_WORDS.map((w) => ({ id: uid(), ...w }))
}

function initCategories() {
  const stored = load('categories', null)
  if (stored) return stored
  return SEED_CATEGORIES.map((c) => ({ ...c }))
}

function initVideos() {
  const stored = load('videos', null)
  if (stored) return stored
  return SEED_VIDEOS.map((v) => ({ id: uid(), ...v }))
}

const EMPTY_PROGRESS = {
  wordStats: {}, // { [wordId]: { seen, correct, wrong } }
  quizzesCompleted: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  streak: 0,
  lastQuizDate: null, // 'YYYY-MM-DD'
}

function initProgress() {
  return { ...EMPTY_PROGRESS, ...load('progress', {}) }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Per-word mastery in [0,1]: rewards correct answers, penalises wrong ones.
export function wordMastery(stat) {
  if (!stat || stat.seen === 0) return 0
  const net = (stat.correct || 0) - (stat.wrong || 0)
  return Math.max(0, Math.min(1, net / 3))
}

// ---- provider ----------------------------------------------------------

export function VocabProvider({ children }) {
  const [words, setWords] = useState(initWords)
  const [categories, setCategories] = useState(initCategories)
  const [videos, setVideos] = useState(initVideos)
  const [progress, setProgress] = useState(initProgress)
  const [displayName, setDisplayNameState] = useState(() => load('displayName', ''))

  // persist
  useEffect(() => save('words', words), [words])
  useEffect(() => save('categories', categories), [categories])
  useEffect(() => save('videos', videos), [videos])
  useEffect(() => save('progress', progress), [progress])
  useEffect(() => save('displayName', displayName), [displayName])

  // ---- vocab CRUD ----
  function addWord(w) {
    const clean = {
      id: uid(),
      category: w.category || 'custom',
      isizulu: (w.isizulu || '').trim(),
      english: (w.english || '').trim(),
      example: (w.example || '').trim(),
      nounClass: (w.nounClass || '').trim(),
    }
    if (!clean.isizulu || !clean.english) return null
    setWords((prev) => [clean, ...prev])
    return clean
  }

  function updateWord(id, patch) {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }

  function deleteWord(id) {
    setWords((prev) => prev.filter((w) => w.id !== id))
  }

  // Bulk import: array of { isizulu, english, example?, nounClass? } into a category.
  // Returns number added.
  function importWords(rows, category) {
    const cleaned = rows
      .map((r) => ({
        id: uid(),
        category: category || 'custom',
        isizulu: (r.isizulu || '').trim(),
        english: (r.english || '').trim(),
        example: (r.example || '').trim(),
        nounClass: (r.nounClass || '').trim(),
      }))
      .filter((r) => r.isizulu && r.english)
    if (cleaned.length) setWords((prev) => [...cleaned, ...prev])
    return cleaned.length
  }

  // ---- category CRUD ----
  function addCategory({ name, emoji }) {
    const trimmed = (name || '').trim()
    if (!trimmed) return null
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid()
    if (categories.some((c) => c.id === id)) return categories.find((c) => c.id === id)
    const cat = { id, name: trimmed, emoji: emoji || '📚' }
    setCategories((prev) => [...prev, cat])
    return cat
  }

  function deleteCategory(id) {
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setWords((prev) => prev.filter((w) => w.category !== id))
    setVideos((prev) => prev.filter((v) => v.categoryId !== id))
  }

  // Re-add any starter words / categories that are missing (matched by text).
  function restoreStarter() {
    setCategories((prev) => {
      const have = new Set(prev.map((c) => c.id))
      const missing = SEED_CATEGORIES.filter((c) => !have.has(c.id))
      return [...prev, ...missing.map((c) => ({ ...c }))]
    })
    setWords((prev) => {
      const key = (w) => `${w.category}::${w.isizulu.toLowerCase()}`
      const have = new Set(prev.map(key))
      const missing = SEED_WORDS.filter((w) => !have.has(key(w)))
      return [...missing.map((w) => ({ id: uid(), ...w })), ...prev]
    })
  }

  // ---- video CRUD ----
  function addVideo({ categoryId, title, youtubeUrl }) {
    if (!youtubeUrl || !youtubeUrl.trim()) return null
    const v = {
      id: uid(),
      categoryId: categoryId || 'general',
      title: (title || '').trim() || 'Untitled video',
      youtubeUrl: youtubeUrl.trim(),
    }
    setVideos((prev) => [...prev, v])
    return v
  }

  function deleteVideo(id) {
    setVideos((prev) => prev.filter((v) => v.id !== id))
  }

  // ---- progress ----
  function recordAnswer(wordId, isCorrect) {
    setProgress((prev) => {
      const s = prev.wordStats[wordId] || { seen: 0, correct: 0, wrong: 0 }
      const next = {
        seen: s.seen + 1,
        correct: s.correct + (isCorrect ? 1 : 0),
        wrong: s.wrong + (isCorrect ? 0 : 1),
      }
      return {
        ...prev,
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        wordStats: { ...prev.wordStats, [wordId]: next },
      }
    })
  }

  function completeQuiz() {
    setProgress((prev) => {
      const today = todayStr()
      let streak = prev.streak
      if (prev.lastQuizDate === today) {
        // already counted today
      } else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        streak = prev.lastQuizDate === yesterday ? prev.streak + 1 : 1
      }
      return {
        ...prev,
        quizzesCompleted: prev.quizzesCompleted + 1,
        streak,
        lastQuizDate: today,
      }
    })
  }

  function resetProgress() {
    setProgress({ ...EMPTY_PROGRESS })
  }

  function setDisplayName(name) {
    setDisplayNameState((name || '').trim().slice(0, 24))
  }

  // ---- derived ----
  const accuracy = progress.totalAnswered
    ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
    : 0

  const masteryByCategory = useMemo(() => {
    const out = {}
    for (const c of categories) {
      const catWords = words.filter((w) => w.category === c.id)
      if (!catWords.length) {
        out[c.id] = { pct: 0, total: 0, seen: 0 }
        continue
      }
      let sum = 0
      let seen = 0
      for (const w of catWords) {
        const stat = progress.wordStats[w.id]
        sum += wordMastery(stat)
        if (stat && stat.seen > 0) seen++
      }
      out[c.id] = {
        pct: Math.round((sum / catWords.length) * 100),
        total: catWords.length,
        seen,
      }
    }
    return out
  }, [categories, words, progress.wordStats])

  // Words the learner gets wrong most (for the "review mistakes" quiz).
  const troubleWords = useMemo(() => {
    return words
      .map((w) => ({ w, stat: progress.wordStats[w.id] }))
      .filter(({ stat }) => stat && stat.wrong > 0)
      .sort((a, b) => {
        const aw = a.stat.wrong - a.stat.correct
        const bw = b.stat.wrong - b.stat.correct
        return bw - aw || b.stat.wrong - a.stat.wrong
      })
      .map(({ w }) => w)
  }, [words, progress.wordStats])

  const value = {
    words,
    categories,
    videos,
    progress,
    accuracy,
    masteryByCategory,
    troubleWords,
    displayName,
    setDisplayName,
    addWord,
    updateWord,
    deleteWord,
    importWords,
    addCategory,
    deleteCategory,
    restoreStarter,
    addVideo,
    deleteVideo,
    recordAnswer,
    completeQuiz,
    resetProgress,
  }

  return <VocabContext.Provider value={value}>{children}</VocabContext.Provider>
}

export function useVocab() {
  const ctx = useContext(VocabContext)
  if (!ctx) throw new Error('useVocab must be used inside <VocabProvider>')
  return ctx
}
