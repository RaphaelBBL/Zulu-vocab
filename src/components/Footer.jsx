import { useState, useEffect } from 'react'
import { useVocab } from '../context/VocabContext'
import {
  submitFeedback, adminListFeedback, adminDeleteFeedback, isSupabaseConfigured,
} from '../lib/supabase'

export default function Footer() {
  const [open, setOpen] = useState(false)
  return (
    <footer className="site-footer">
      <button className="btn subtle sm" onClick={() => setOpen(true)}>💬 Suggestions & feedback</button>
      <div className="made-by">Made by Raphael</div>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </footer>
  )
}

function FeedbackModal({ onClose }) {
  const { displayName, isAdmin, adminPassword } = useVocab()
  const [name, setName] = useState(displayName || '')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [list, setList] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  async function loadList() {
    if (!isAdmin) return
    setLoadingList(true)
    const { data } = await adminListFeedback(adminPassword)
    setList(data)
    setLoadingList(false)
  }
  useEffect(() => { loadList() }, [])

  async function send() {
    if (!message.trim()) return
    setStatus('sending')
    const { error } = await submitFeedback({ name, message })
    if (error) { setStatus('error'); return }
    setStatus('sent'); setMessage('')
    if (isAdmin) loadList()
  }

  async function remove(id) {
    const { error } = await adminDeleteFeedback(id, adminPassword)
    if (!error) setList((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Suggestions & ideas</h2>
        <p className="subtitle">
          Got an idea, a word list to add, or a comment? Send it through — it goes
          straight to the person running the app.
        </p>

        {!isSupabaseConfigured ? (
          <div className="notice">Suggestions need the Supabase backend connected. See the README.</div>
        ) : status === 'sent' ? (
          <div className="notice">Ngiyabonga — thanks! Your suggestion was sent. 🙌
            <div className="mt"><button className="btn sm subtle" onClick={() => setStatus('idle')}>Send another</button></div>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Your name (optional)</label>
              <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Anonymous" />
            </div>
            <div className="field">
              <label>Your suggestion *</label>
              <textarea value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Please add a category for weather words…" style={{ minHeight: 100 }} />
            </div>
            <button className="btn gold block" onClick={send} disabled={!message.trim() || status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send suggestion'}
            </button>
            {status === 'error' && <p className="feedback bad small mt">Couldn't send. Check your connection and try again.</p>}
          </>
        )}

        {/* Admin-only inbox */}
        {isAdmin && (
          <div className="mt">
            <div className="row between">
              <h2 style={{ margin: '18px 0 8px' }}>Inbox ({list.length})</h2>
              <button className="btn sm subtle" onClick={loadList}>Refresh</button>
            </div>
            {loadingList && <div className="empty">Loading…</div>}
            {!loadingList && list.length === 0 && <div className="empty">No suggestions yet.</div>}
            {list.map((f) => (
              <div key={f.id} className="card mb" style={{ padding: 12 }}>
                <div className="row between">
                  <b style={{ fontSize: '0.9rem' }}>{f.name || 'Anonymous'}</b>
                  <button className="icon-btn" title="Delete" onClick={() => remove(f.id)}>✕</button>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{f.message}</div>
                <div className="small muted mt">{new Date(f.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn subtle" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
