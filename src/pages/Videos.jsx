import { useState } from 'react'
import { useVocab } from '../context/VocabContext'
import VideoEmbed from '../components/VideoEmbed'
import { VIDEO_SEARCH_HINTS } from '../data/seedVideos'

export default function Videos() {
  const { categories, videos, addVideo, deleteVideo } = useVocab()
  const [showAdd, setShowAdd] = useState(false)

  // Group videos by category, with a 'general' bucket.
  const buckets = [{ id: 'general', name: 'General isiZulu', emoji: '🌍' }, ...categories]

  return (
    <div>
      <div className="row between">
        <h1 className="display">Videos</h1>
        <button className="btn sm" onClick={() => setShowAdd(true)}>Add video</button>
      </div>
      <p className="subtitle">
        Attach YouTube clips to each topic for pronunciation and lessons. Paste a
        video link to embed it, or a search link to open on YouTube.
      </p>

      <div className="notice mb">
        Good things to search on YouTube:{' '}
        {VIDEO_SEARCH_HINTS.map((h, i) => (
          <span key={h}>
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(h)}`} target="_blank" rel="noreferrer">“{h}”</a>
            {i < VIDEO_SEARCH_HINTS.length - 1 ? ' · ' : ''}
          </span>
        ))}
      </div>

      {buckets.map((b) => {
        const list = videos.filter((v) => v.categoryId === b.id)
        if (list.length === 0) return null
        return (
          <div key={b.id} className="mb">
            <h2>{b.emoji} {b.name}</h2>
            <div className="grid">
              {list.map((v) => (
                <VideoEmbed key={v.id} video={v} onDelete={() => { if (confirm('Remove this video?')) deleteVideo(v.id) }} />
              ))}
            </div>
          </div>
        )
      })}

      {videos.length === 0 && (
        <div className="empty">No videos yet. Add one with the button above.</div>
      )}

      {showAdd && (
        <AddVideoModal
          categories={buckets}
          onSave={(data) => { addVideo(data); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function AddVideoModal({ categories, onSave, onClose }) {
  const [title, setTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [categoryId, setCategoryId] = useState('general')

  function submit(e) {
    e.preventDefault()
    if (!youtubeUrl.trim()) return
    onSave({ title, youtubeUrl, categoryId })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Add a video</h2>
        <div className="field">
          <label>YouTube URL *</label>
          <input autoFocus value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
        </div>
        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Zulu greetings lesson" />
        </div>
        <div className="field">
          <label>Topic</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
        <div className="row between mt">
          <button type="button" className="btn subtle" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={!youtubeUrl.trim()}>Add video</button>
        </div>
      </form>
    </div>
  )
}
