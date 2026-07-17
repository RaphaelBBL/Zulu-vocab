// Turn freeform isiZulu notes (a PDF or pasted text) into candidate vocab
// pairs. This is best-effort: the owner reviews and fixes the result before
// anything is published, so we favour recall (catch plausible pairs) and let a
// human prune.

// --- PDF -> text ---------------------------------------------------------
// pdf.js is heavy, so we load it only when a PDF is actually dropped.
export async function pdfToText(file) {
  const pdfjs = await import('pdfjs-dist')
  // Vite resolves the worker file to a URL we can hand to pdf.js.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  let out = ''
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    // Rebuild lines: pdf.js gives items with positions; items that end a line
    // carry hasEOL. We join with spaces and break on EOL markers.
    let line = ''
    for (const item of content.items) {
      line += item.str
      if (item.hasEOL) {
        out += line + '\n'
        line = ''
      } else {
        line += ' '
      }
    }
    if (line.trim()) out += line + '\n'
    out += '\n'
  }
  return out
}

// --- text -> candidate pairs --------------------------------------------

// Separators we treat as "isiZulu <sep> English" on a single line.
const SEP = /\s*(?:[–—\-:=]|\bmeans\b|\bis\b(?=\s))\s*/i

// Strip list bullets / numbering / trailing noise from the front of a line.
function cleanLine(s) {
  return s
    .replace(/^[\s•▪●*·•\-–—]+/, '') // leading bullets
    .replace(/^\d+[.)]\s*/, '') // leading "1. " / "2) "
    .trim()
}

// Heuristic: does this look like isiZulu rather than English?
// isiZulu words very often start with a noun-class / verb prefix.
const ZULU_PREFIX = /^(um|umu|aba|ab|imi|i|ili|ama|isi|izi|in|im|izin|izim|ubu|uku|uk|ulu|u|olu|ka|nga|ngi)/i
function looksZulu(s) {
  const w = s.trim().toLowerCase()
  if (!w) return false
  // English-only letters that don't occur in isiZulu orthography.
  if (/[qxc]/.test(w) === false && ZULU_PREFIX.test(w)) return true
  return ZULU_PREFIX.test(w)
}

// Parse one line into { isizulu, english } or null.
function parseLine(raw) {
  const line = cleanLine(raw)
  if (!line || line.length < 3) return null
  // Skip obvious headings (ALL CAPS short, or ends with ':')
  if (/^[A-Z0-9 ]{2,}$/.test(line) && !SEP.test(line)) return null

  const parts = line.split(SEP)
  if (parts.length < 2) return null
  let left = parts[0].trim()
  let right = parts.slice(1).join(' ').trim()
  if (!left || !right) return null
  if (left.length > 60 || right.length > 80) return null
  // If both sides have several words each, it's probably a sentence, not a pair.
  if (left.split(/\s+/).length > 5) return null

  // Decide orientation: prefer the side that looks isiZulu on the left.
  if (!looksZulu(left) && looksZulu(right)) {
    ;[left, right] = [right, left]
  }
  return { isizulu: left, english: right }
}

export function extractPairs(text) {
  const seen = new Set()
  const out = []
  for (const raw of (text || '').split(/\r?\n/)) {
    const pair = parseLine(raw)
    if (!pair) continue
    const key = pair.isizulu.toLowerCase() + '|' + pair.english.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(pair)
  }
  return out
}
