// Map a free-typed school (short form, typo, abbreviation) to its canonical
// name using the admin-managed schools directory. Falls back to the tidied
// input if nothing matches.

function norm(s) {
  return (s || '').toLowerCase().replace(/[.'’]/g, '').replace(/\s+/g, ' ').trim()
}

export function normalizeSchool(input, schools) {
  const q = norm(input)
  if (!q) return ''
  // 1. exact name or alias match
  for (const s of schools) {
    if (norm(s.name) === q) return s.name
    if ((s.aliases || []).some((a) => norm(a) === q)) return s.name
  }
  // 2. prefix / contains match against names and aliases
  for (const s of schools) {
    const n = norm(s.name)
    if (n.startsWith(q) || q.startsWith(n) || n.includes(q) || q.includes(n)) return s.name
    if ((s.aliases || []).some((a) => { const al = norm(a); return al && (al.startsWith(q) || q.startsWith(al)) })) return s.name
  }
  // 3. unknown — keep what they typed (trimmed)
  return input.trim()
}

export function sameSchool(a, b) {
  return norm(a) && norm(a) === norm(b)
}
