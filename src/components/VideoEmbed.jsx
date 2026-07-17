// Turn a YouTube URL into an embedded player. If we can't extract a video id
// (e.g. it's a search-results link), we fall back to a tidy outbound link.

export function youtubeId(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null
    if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v')
      // /embed/ID or /shorts/ID
      const m = u.pathname.match(/\/(embed|shorts)\/([\w-]+)/)
      if (m) return m[2]
    }
  } catch {
    /* not a URL */
  }
  return null
}

export default function VideoEmbed({ video, onDelete }) {
  const id = youtubeId(video.youtubeUrl)
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="row between mb">
        <b style={{ fontSize: '0.95rem' }}>{video.title}</b>
        {onDelete && (
          <button className="icon-btn" title="Remove" onClick={onDelete}>✕</button>
        )}
      </div>
      {id ? (
        <div className="video-embed">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <a className="video-link" href={video.youtubeUrl} target="_blank" rel="noreferrer">
          Open on YouTube ↗
          <div className="small muted" style={{ fontWeight: 400, marginTop: 4 }}>
            This is a search/playlist link — paste a single video URL to embed it here.
          </div>
        </a>
      )}
    </div>
  )
}
