import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { load, save, uid } from '../lib/storage'
import { SEED_CATEGORIES, SEED_WORDS } from '../data/seedVocab'
import { SEED_VIDEOS } from '../data/seedVideos'
import { SEED_CATEGORIES_AF, SEED_WORDS_AF, SEED_VIDEOS_AF } from '../data/seedVocabAf'

const VocabContext = createContext(null)

export const LANGUAGES = [
  { id: 'zulu', label: 'isiZulu', flag: '🇿🇦', tag: 'isiZulu' },
  { id: 'afrikaans', label: 'Afrikaans', flag: '🇿🇦', tag: 'Afrikaans' },
]

// ---- initial hydration (with migration from the single-language version) ---
function seedWords() {
  return [
    ...SEED_WORDS.map((w) => ({ id: uid(), language: 'zulu', ...w })),
    ...SEED_WORDS_AF.map((w) => ({ id: uid(), language: 'afrikaans', ...w })),
  ]
}
function initWords() {
  const stored = load('words', null)
  if (!stored) return seedWords()
  let migrated = stored.map((w) => (w.language ? w : { ...w, language: 'zulu' }))
  if (!migrated.some((w) => w.language === 'afrikaans')) {
    migrated = [...migrated, ...SEED_WORDS_AF.map((w) => ({ id: uid(), language: 'afrikaans', ...w }))]
  }
  return migrated
}

function seedCats() {
  return [
    ...SEED_CATEGORIES.map((c) => ({ ...c, language: 'zulu' })),
    ...SEED_CATEGORIES_AF.map((c) => ({ ...c, language: 'afrikaans' })),
  ]
}
function initCategories() {
  const stored = load('categories', null)
  if (!stored) return seedCats()
  let migrated = stored.map((c) => (c.language ? c : { ...c, language: 'zulu' }))
  if (!migrated.some((c) => c.language === 'afrikaans')) {
    migrated = [...migrated, ...SEED_CATEGORIES_AF.map((c) => ({ ...c, language: 'afrikaans' }))]
  }
  return migrated
}

function seedVids() {
  return [
    ...SEED_VIDEOS.map((v) => ({ id: uid(), language: 'zulu', ...v })),
    ...SEED_VIDEOS_AF.map((v) => ({ id: uid(), language: 'afrikaans', ...v })),
  ]
}
function initVideos() {
  const stored = load('videos', null)
  if (!stored) return seedVids()
  let migrated = stored.map((v) => (v.language ? v : { ...v, language: 'zulu' }))
  if (!migrated.some((v) => v.language === 'afrikaans')) {
    migrated = [...migrated, ...SEED_VIDEOS_AF.map((v) => ({ id: uid(), language: 'afrikaans', ...v }))]
  }
  return migrated
}

const EMPTY_PROGRESS = {
  wordStats: {}, quizzesCompleted: 0, totalAnswered: 0, totalCorrect: 0, streak: 0, lastQuizDate: null,
}
function initProgress() { return { ...EMPTY_PROGRESS, ...load('progress', {}) } }
function todayStr() { return new Date().toISOString().slice(0, 10) }

export function wordMastery(stat) {
  if (!stat || stat.seen === 0) return 0
  const net = (stat.correct || 0) - (stat.wrong || 0)
  return Math.max(0, Math.min(1, net / 3))
}

export function VocabProvider({ children }) {
  const [language, setLanguageState] = useState(() => load('language', 'zulu'))
  const [allWords, setAllWords] = useState(initWords)
  const [allCategories, setAllCategories] = useState(initCategories)
  const [allVideos, setAllVideos] = useState(initVideos)
  const [progress, setProgress] = useState(initProgress)
  const [displayName, setDisplayNameState] = useState(() => load('displayName', ''))
  const [adminPassword, setAdminPasswordState] = useState(() => load('adminPassword', ''))

  useEffect(() => save('language', language), [language])
  useEffect(() => save('words', allWords), [allWords])
  useEffect(() => save('categories', allCategories), [allCategories])
  useEffect(() => save('videos', allVideos), [allVideos])
  useEffect(() => save('progress', progress), [progress])
  useEffect(() => save('displayName', displayName), [displayName])
  useEffect(() => save('adminPassword', adminPassword), [adminPassword])

  // current-language views
  const words = useMemo(() => allWords.filter((w) => w.language === language), [allWords, language])
  const categories = useMemo(() => allCategories.filter((c) => c.language === language), [allCategories, language])
  const videos = useMemo(() => allVideos.filter((v) => v.language === language), [allVideos, language])

  function setLanguage(id) { setLanguageState(id) }

  // ---- vocab CRUD (tagged with current language) ----
  function addWord(w) {
    const clean = {
      id: uid(), language,
      category: w.category || 'custom',
      isizulu: (w.isizulu || '').trim(),
      english: (w.english || '').trim(),
      example: (w.example || '').trim(),
      nounClass: (w.nounClass || '').trim(),
    }
    if (!clean.isizulu || !clean.english) return null
    setAllWords((prev) => [clean, ...prev])
    return clean
  }
  function updateWord(id, patch) {
    setAllWords((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }
  function deleteWord(id) { setAllWords((prev) => prev.filter((w) => w.id !== id)) }

  function importWords(rows, category) {
    const cleaned = rows
      .map((r) => ({
        id: uid(), language,
        category: category || 'custom',
        isizulu: (r.isizulu || '').trim(),
        english: (r.english || '').trim(),
        example: (r.example || '').trim(),
        nounClass: (r.nounClass || '').trim(),
      }))
      .filter((r) => r.isizulu && r.english)
    if (cleaned.length) setAllWords((prev) => [...cleaned, ...prev])
    return cleaned.length
  }

  // ---- category CRUD ----
  function addCategory({ name, emoji }) {
    const trimmed = (name || '').trim()
    if (!trimmed) return null
    let base = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid()
    const id = `${language === 'afrikaans' ? 'af-' : ''}${base}`
    const existing = allCategories.find((c) => c.id === id && c.language === language)
    if (existing) return existing
    const cat = { id, name: trimmed, emoji: emoji || '📚', language }
    setAllCategories((prev) => [...prev, cat])
    return cat
  }
  function deleteCategory(id) {
    setAllCategories((prev) => prev.filter((c) => c.id !== id))
    setAllWords((prev) => prev.filter((w) => w.category !== id))
    setAllVideos((prev) => prev.filter((v) => v.categoryId !== id))
  }

  function restoreStarter() {
    const seedC = language === 'afrikaans' ? SEED_CATEGORIES_AF : SEED_CATEGORIES
    const seedW = language === 'afrikaans' ? SEED_WORDS_AF : SEED_WORDS
    setAllCategories((prev) => {
      const have = new Set(prev.filter((c) => c.language === language).map((c) => c.id))
      const missing = seedC.filter((c) => !have.has(c.id))
      return [...prev, ...missing.map((c) => ({ ...c, language }))]
    })
    setAllWords((prev) => {
      const key = (w) => `${w.language}::${w.category}::${w.isizulu.toLowerCase()}`
      const have = new Set(prev.map(key))
      const missing = seedW.filter((w) => !have.has(`${language}::${w.category}::${w.isizulu.toLowerCase()}`))
      return [...missing.map((w) => ({ id: uid(), language, ...w })), ...prev]
    })
  }

  // ---- video CRUD ----
  function addVideo({ categoryId, title, youtubeUrl }) {
    if (!youtubeUrl || !youtubeUrl.trim()) return null
    const v = {
      id: uid(), language,
      categoryId: categoryId || 'general',
      title: (title || '').trim() || 'Untitled video',
      youtubeUrl: youtubeUrl.trim(),
    }
    setAllVideos((prev) => [...prev, v])
    return v
  }
  function deleteVideo(id) { setAllVideos((prev) => prev.filter((v) => v.id !== id)) }

  // ---- progress ----
  function recordAnswer(wordId, isCorrect) {
    setProgress((prev) => {
      const s = prev.wordStats[wordId] || { seen: 0, correct: 0, wrong: 0 }
      const next = { seen: s.seen + 1, correct: s.correct + (isCorrect ? 1 : 0), wrong: s.wrong + (isCorrect ? 0 : 1) }
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
      if (prev.lastQuizDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        streak = prev.lastQuizDate === yesterday ? prev.streak + 1 : 1
      }
      return { ...prev, quizzesCompleted: prev.quizzesCompleted + 1, streak, lastQuizDate: today }
    })
  }
  function resetProgress() { setProgress({ ...EMPTY_PROGRESS }) }

  function setDisplayName(name) { setDisplayNameState((name || '').trim().slice(0, 24)) }
  function setAdminPassword(pw) { setAdminPasswordState(pw || '') }
  function clearAdmin() { setAdminPasswordState('') }

  // ---- derived ----
  const accuracy = progress.totalAnswered
    ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0

  const masteryByCategory = useMemo(() => {
    const out = {}
    for (const c of categories) {
      const catWords = words.filter((w) => w.category === c.id)
      if (!catWords.length) { out[c.id] = { pct: 0, total: 0, seen: 0 }; continue }
      let sum = 0, seen = 0
      for (const w of catWords) {
        const stat = progress.wordStats[w.id]
        sum += wordMastery(stat)
        if (stat && stat.seen > 0) seen++
      }
      out[c.id] = { pct: Math.round((sum / catWords.length) * 100), total: catWords.length, seen }
    }
    return out
  }, [categories, words, progress.wordStats])

  const troubleWords = useMemo(() => {
    return words
      .map((w) => ({ w, stat: progress.wordStats[w.id] }))
      .filter(({ stat }) => stat && stat.wrong > 0)
      .sort((a, b) => (b.stat.wrong - b.stat.correct) - (a.stat.wrong - a.stat.correct) || b.stat.wrong - a.stat.wrong)
      .map(({ w }) => w)
  }, [words, progress.wordStats])

  const value = {
    language, setLanguage, languageTag: LANGUAGES.find((l) => l.id === language)?.tag || 'isiZulu',
    words, categories, videos,
    progress, accuracy, masteryByCategory, troubleWords,
    displayName, setDisplayName,
    adminPassword, isAdmin: !!adminPassword, setAdminPassword, clearAdmin,
    addWord, updateWord, deleteWord, importWords,
    addCategory, deleteCategory, restoreStarter,
    addVideo, deleteVideo,
    recordAnswer, completeQuiz, resetProgress,
  }
  return <VocabContext.Provider value={value}>{children}</VocabContext.Provider>
}

export function useVocab() {
  const ctx = useContext(VocabContext)
  if (!ctx) throw new Error('useVocab must be used inside <VocabProvider>')
  return ctx
}
