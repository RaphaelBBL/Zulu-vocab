import { useState } from 'react'
import { useVocab } from '../context/VocabContext'
import { submitFeedback, isSupabaseConfigured } from '../lib/supabase'

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
  const { displayName } = useVocab()
  const [name, setName] = useState(displayName || '')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  async function send() {
    if (!message.trim()) return
    setStatus('sending')
    const { error } = await submitFeedback({ name, message })
    if (error) { setStatus('error'); return }
    setStatus('sent'); setMessage('')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Suggestions & ideas</h2>
        <p className="subtitle">
          Got an idea, a word list to add, or a comment? Send it through — it goes
          straight to the person running the app. (Only they can read it.)
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

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn subtle" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
