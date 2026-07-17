import { useMemo, useState } from 'react'
import { useVocab } from '../context/VocabContext'

const EMOJIS = ['📚', '👋', '👪', '🏫', '🍲', '🏃', '🎨', '🌈', '🧍', '🐘', '🔢', '⚽', '🌦️', '🕒', '🚗', '💼']

export default function Vocab() {
  const {
    words, categories, addWord, updateWord, deleteWord,
    importWords, addCategory, deleteCategory, restoreStarter,
  } = useVocab()

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // word being edited (or 'new')
  const [showCat, setShowCat] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const catName = (id) => categories.find((c) => c.id === id)?.name || id

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return words.filter((w) => {
      if (filter !== 'all' && w.category !== filter) return false
      if (!q) return true
      return (
        w.isizulu.toLowerCase().includes(q) ||
        w.english.toLowerCase().includes(q)
      )
    })
  }, [words, filter, search])

  return (
    <div>
      <div className="row between">
        <h1>Vocabulary</h1>
        <span className="chip">{words.length} words</span>
      </div>
      <p className="subtitle">Browse, edit and build your word lists. Everything you add is saved on this device.</p>

      <div className="row mb" style={{ gap: 8 }}>
        <button className="btn sm" onClick={() => setEditing('new')}>➕ Add word</button>
        <button className="btn sm subtle" onClick={() => setShowCat(true)}>🗂️ New list</button>
        <button className="btn sm subtle" onClick={() => setShowImport(true)}>📥 Import</button>
        <button className="btn sm ghost" onClick={restoreStarter} title="Re-add any missing starter words">↺ Restore starter</button>
      </div>

      <input
        className="mb"
        placeholder="🔍 Search isiZulu or English…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="chip-row mb">
        <span className={'chip' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>
          All
        </span>
        {categories.map((c) => (
          <span
            key={c.id}
            className={'chip' + (filter === c.id ? ' active' : '')}
            onClick={() => setFilter(c.id)}
          >
            {c.emoji} {c.name}
          </span>
        ))}
      </div>

      {filter !== 'all' && (
        <div className="row between mb">
          <span className="small muted">
            {visible.length} word{visible.length !== 1 ? 's' : ''} in {catName(filter)}
          </span>
          <button
            className="btn sm danger"
            onClick={() => {
              if (confirm(`Delete the "${catName(filter)}" list and all its words?`)) {
                deleteCategory(filter)
                setFilter('all')
              }
            }}
          >
            Delete this list
          </button>
        </div>
      )}

      <div className="card" style={{ padding: 4 }}>
        {visible.length === 0 && <div className="empty">No words here yet. Add some! 🌱</div>}
        {visible.map((w) => (
          <div className="word" key={w.id}>
            <div className="spread">
              <div className="row" style={{ gap: 8 }}>
                <span className="zu">{w.isizulu}</span>
                {w.nounClass && <span className="nc">class {w.nounClass}</span>}
              </div>
              <div className="en">{w.english}</div>
              {w.example && <div className="ex">{w.example}</div>}
              {filter === 'all' && <div className="small muted" style={{ marginTop: 2 }}>{catName(w.category)}</div>}
            </div>
            <div className="actions">
              <button className="icon-btn" title="Edit" onClick={() => setEditing(w)}>✏️</button>
              <button
                className="icon-btn"
                title="Delete"
                onClick={() => { if (confirm(`Delete "${w.isizulu}"?`)) deleteWord(w.id) }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <WordModal
          word={editing === 'new' ? null : editing}
          categories={categories}
          defaultCategory={filter !== 'all' ? filter : categories[0]?.id}
          onSave={(data) => {
            if (editing === 'new') addWord(data)
            else updateWord(editing.id, data)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {showCat && (
        <CategoryModal
          onSave={({ name, emoji }) => {
            const c = addCategory({ name, emoji })
            setShowCat(false)
            if (c) setFilter(c.id)
          }}
          onClose={() => setShowCat(false)}
        />
      )}

      {showImport && (
        <ImportModal
          categories={categories}
          defaultCategory={filter !== 'all' ? filter : categories[0]?.id}
          onImport={(rows, category) => {
            const n = importWords(rows, category)
            setShowImport(false)
            if (n) { setFilter(category); alert(`Imported ${n} word${n !== 1 ? 's' : ''}. 🎉`) }
            else alert('No valid rows found. Use: isiZulu, English (one per line).')
          }}
          onAddCategory={addCategory}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

// ---------- word add/edit modal ----------
function WordModal({ word, categories, defaultCategory, onSave, onClose }) {
  const [isizulu, setIsizulu] = useState(word?.isizulu || '')
  const [english, setEnglish] = useState(word?.english || '')
  const [example, setExample] = useState(word?.example || '')
  const [nounClass, setNounClass] = useState(word?.nounClass || '')
  const [category, setCategory] = useState(word?.category || defaultCategory || categories[0]?.id || 'custom')

  function submit(e) {
    e.preventDefault()
    if (!isizulu.trim() || !english.trim()) return
    onSave({ isizulu, english, example, nounClass, category })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>{word ? 'Edit word' : 'Add a word'}</h2>
        <div className="field">
          <label>isiZulu *</label>
          <input autoFocus value={isizulu} onChange={(e) => setIsizulu(e.target.value)} placeholder="e.g. inja" />
        </div>
        <div className="field">
          <label>English meaning *</label>
          <input value={english} onChange={(e) => setEnglish(e.target.value)} placeholder="e.g. dog" />
        </div>
        <div className="field">
          <label>Example sentence (optional)</label>
          <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Inja iyakhonkotha. — The dog barks." />
        </div>
        <div className="row">
          <div className="field spread">
            <label>Noun class (optional)</label>
            <input value={nounClass} onChange={(e) => setNounClass(e.target.value)} placeholder="e.g. 9" />
          </div>
          <div className="field spread">
            <label>List</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="row between mt">
          <button type="button" className="btn subtle" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={!isizulu.trim() || !english.trim()}>Save</button>
        </div>
      </form>
    </div>
  )
}

// ---------- new category modal ----------
function CategoryModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📚')
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSave({ name, emoji }) }}>
        <h2 style={{ marginTop: 0 }}>New word list</h2>
        <p className="subtitle">Great for loading a topic from your syllabus.</p>
        <div className="field">
          <label>List name *</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weather, Sports, Unit 4" />
        </div>
        <div className="field">
          <label>Pick an icon</label>
          <div className="chip-row">
            {EMOJIS.map((em) => (
              <span key={em} className={'chip' + (emoji === em ? ' active' : '')} onClick={() => setEmoji(em)} style={{ fontSize: '1.1rem' }}>
                {em}
              </span>
            ))}
          </div>
        </div>
        <div className="row between mt">
          <button type="button" className="btn subtle" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={!name.trim()}>Create list</button>
        </div>
      </form>
    </div>
  )
}

// ---------- import modal ----------
function ImportModal({ categories, defaultCategory, onImport, onAddCategory, onClose }) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState(defaultCategory || categories[0]?.id || 'custom')
  const [newListName, setNewListName] = useState('')

  const parsed = useMemo(() => parseRows(text), [text])

  function submit(e) {
    e.preventDefault()
    let cat = category
    if (category === '__new__') {
      const c = onAddCategory({ name: newListName || 'Imported list', emoji: '📥' })
      cat = c?.id || 'custom'
    }
    onImport(parsed, cat)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Import words</h2>
        <p className="subtitle">
          Paste one word per line as <b>isiZulu, English</b>. You can also add an
          example and noun class: <code>isiZulu, English, example, class</code>.
          Tabs or commas both work — great for pasting from a spreadsheet.
        </p>
        <div className="field">
          <label>Paste your list</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'inja, dog\nikati, cat\nusuku, day, Usuku oluhle!, 11'}
            style={{ minHeight: 140 }}
          />
        </div>
        <div className="field">
          <label>Add into list</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
            <option value="__new__">➕ Create a new list…</option>
          </select>
        </div>
        {category === '__new__' && (
          <div className="field">
            <label>New list name</label>
            <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g. My syllabus — Term 3" />
          </div>
        )}
        <div className="notice mb">
          {parsed.length > 0
            ? `✅ ${parsed.length} valid word${parsed.length !== 1 ? 's' : ''} ready to import.`
            : 'Waiting for valid rows (need at least isiZulu and English).'}
        </div>
        <div className="row between">
          <button type="button" className="btn subtle" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={parsed.length === 0}>Import {parsed.length || ''}</button>
        </div>
      </form>
    </div>
  )
}

// Parse pasted text into rows. Splits each line on comma OR tab.
function parseRows(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t|,/).map((p) => p.trim())
      const [isizulu, english, example, nounClass] = parts
      return { isizulu, english, example, nounClass }
    })
    .filter((r) => r.isizulu && r.english)
}
