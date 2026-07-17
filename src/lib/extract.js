// Turn freeform notes (a PDF or pasted text) into candidate vocab pairs.
// Best-effort: the owner reviews and fixes the result before publishing, so we
// favour recall (catch plausible pairs) and let a human prune.

// --- PDF -> text ---------------------------------------------------------
export async function pdfToText(file) {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  let out = ''
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    // pdf.js already emits the column spacing (multiple spaces between table
    // columns), so we just concatenate and let the parser split on wide gaps.
    let line = ''
    for (const item of content.items) {
      line += item.str
      if (item.hasEOL) { out += line + '\n'; line = '' } else if (!line.endsWith(' ')) line += ' '
    }
    if (line.trim()) out += line + '\n'
    out += '\n'
  }
  return out
}

// --- text -> candidate pairs --------------------------------------------

// Single-line separators (for lines that are NOT laid out in columns).
const INLINE_SEP = /\s*(?:[–—]|\s-\s|:|=|\s\/\s|\bmeans\b|\bis\b(?=\s))\s*/i

const HEADER_WORDS = /^(isizulu|english|zulu|afrikaans|meaning|notes?|amanothi|incazelo|isisho|indikimba|theme|word|vocab\w*)$/i

// Strip leading bullets/numbering and trailing space, but KEEP internal
// multi-space runs — those mark the column boundaries in tables.
function stripEdges(s) {
  return s
    .replace(/^[\s•▪●*·\-–—]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/\s+$/, '')
}

// isiZulu / Afrikaans words tend to start with these; used only to guess which
// side is the "term" vs the English gloss when a row looks reversed.
const TERM_PREFIX = /^(um|umu|aba|ab|imi|ili|ama|isi|izi|in|im|izin|izim|ubu|uku|uk|ulu|olu|die|het|'n)\b|^(um|aba|isi|izi|in|im|ubu|uku|ulu|u|i|a)/i
const ENGLISH_HINT = /^(a|an|the|to|to\s|is|of)\b/i

function looksTerm(s) {
  const w = (s || '').trim().toLowerCase()
  if (!w) return false
  if (ENGLISH_HINT.test(w)) return false
  return TERM_PREFIX.test(w)
}

// A "term" (the word being learned) should be short and not look like a prose
// fragment: 1–4 words, and either it starts with a term-prefix or it's a short
// lowercase word/phrase.
function looksLikeTerm(s) {
  const w = s.trim()
  if (!w) return false
  const words = w.split(/\s+/)
  if (words.length > 4) return false
  if (/[,;.]/.test(w)) return false
  if (looksTerm(w)) return true
  return /^[a-zà-ÿ'][a-zà-ÿ' -]{1,24}$/i.test(w) && !/^(the|and|but|she|he|they|her|his|it|is|at|in|of|to|from|with|for|a|an)\b/i.test(w)
}

function makePair(left, right) {
  left = (left || '').trim().replace(/[.;,:]+$/, '')
  right = (right || '').trim().replace(/[.;:]+$/, '')
  if (!left || !right) return null
  if (HEADER_WORDS.test(left) || HEADER_WORDS.test(right)) return null
  if (/\((isizulu|english|zulu|afrikaans)\)/i.test(left + right)) return null // column headers
  // If the left looks English and the right looks like a term, swap first.
  if (!looksTerm(left) && looksTerm(right)) [left, right] = [right, left]
  if (left.length > 36 || right.length > 50) return null
  if (left.split(/\s+/).length > 3 || right.split(/\s+/).length > 5) return null
  if (/[,;]$/.test(right) || /;/.test(right)) return null // wrapped / prose meaning
  if (/\d\s*$/.test(right)) return null // page-footer numbers
  if (right.includes('|')) return null // chapter/section headers
  if (looksTerm(right)) return null // the "English" side is actually a term -> prose
  if (!looksLikeTerm(left)) return null // the term must look like a real term
  return { isizulu: left, english: right }
}

function parseLine(raw) {
  const line = stripEdges(raw)
  if (!line || line.trim().length < 3) return []

  // 1) Column layout: cells separated by a tab or a run of 2+ spaces.
  const cells = line.split(/\t|\s{2,}/).map((c) => c.trim()).filter(Boolean)
  if (cells.length >= 2) {
    const pair = makePair(cells[0], cells[1])
    return pair ? [pair] : []
  }

  // 2) Single cell: try an inline separator (umama – mother, isibindi / courage).
  const flat = line.replace(/\s+/g, ' ').trim()
  const parts = flat.split(INLINE_SEP)
  if (parts.length >= 2) {
    const pair = makePair(parts[0], parts.slice(1).join(' '))
    return pair ? [pair] : []
  }
  return []
}

export function extractPairs(text) {
  const seen = new Set()
  const out = []
  for (const raw of (text || '').split(/\r?\n/)) {
    for (const pair of parseLine(raw)) {
      const key = pair.isizulu.toLowerCase() + '|' + pair.english.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(pair)
    }
  }
  return out
}
