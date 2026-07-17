import { useState } from 'react'
import { useVocab } from '../context/VocabContext'

export default function NameModal({ onClose }) {
  const { displayName, setDisplayName } = useVocab()
  const [name, setName] = useState(displayName || '')

  function submit(e) {
    e.preventDefault()
    setDisplayName(name)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>👤 Your display name</h2>
        <p className="subtitle">
          This is the name that appears on the shared leaderboard when you post a
          score. Pick something your classmates will recognise.
        </p>
        <div className="field">
          <label>Display name</label>
          <input
            autoFocus
            value={name}
            maxLength={24}
            placeholder="e.g. Thabo M"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="row between">
          <button type="button" className="btn subtle" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={!name.trim()}>
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
