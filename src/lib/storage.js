// Tiny localStorage wrapper. Everything personal (custom vocab, videos,
// progress, display name) lives here on the user's own device.

const PREFIX = 'zulu-vocab:'

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch (e) {
    console.warn('storage load failed for', key, e)
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.warn('storage save failed for', key, e)
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch (e) {
    /* ignore */
  }
}

// Simple unique id — good enough for local records.
export function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}
