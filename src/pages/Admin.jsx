import { useEffect, useState } from 'react'
import { useVocab } from '../context/VocabContext'
import {
  isSupabaseConfigured, verifyAdmin,
  fetchChallenges, adminDeleteChallenge,
  fetchSchools, adminAddSchool, adminDeleteSchool, adminSetSchool,
  adminListFeedback, adminDeleteFeedback,
} from '../lib/supabase'

export default function Admin({ go }) {
  const { isAdmin, adminPassword, setAdminPassword, clearAdmin } = useVocab()

  if (!isSupabaseConfigured) {
    return (
      <div>
        <h1 className="display">Admin</h1>
        <div className="card"><div className="notice">Admin tools need the Supabase backend connected. See the README.</div></div>
      </div>
    )
  }

  if (!isAdmin) return <SignIn onUnlock={setAdminPassword} />

  return (
    <div>
      <div className="row between">
        <h1 className="display">Admin centre</h1>
        <button className="btn sm subtle" onClick={clearAdmin}>Lock</button>
      </div>
      <p className="subtitle">Control the shared parts of the app — challenges, schools, and suggestions.</p>

      <ChallengesAdmin password={adminPassword} go={go} />
      <SchoolsAdmin password={adminPassword} />
      <AssignSchool password={adminPassword} />
      <FeedbackAdmin password={adminPassword} />
    </div>
  )
}

function SignIn({ onUnlock }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [wrong, setWrong] = useState(false)
  async function unlock() {
    setBusy(true); setWrong(false)
    const ok = await verifyAdmin(pw)
    setBusy(false)
    if (ok) onUnlock(pw.trim()); else setWrong(true)
  }
  return (
    <div>
      <h1 className="display">Admin</h1>
      <p className="subtitle">Enter the admin password to manage the app.</p>
      <div className="card">
        <label>Admin password</label>
        <div className="row" style={{ gap: 8 }}>
          <input className="spread" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setWrong(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') unlock() }} placeholder="Enter admin password" />
          <button className="btn" onClick={unlock} disabled={busy || !pw.trim()}>{busy ? '…' : 'Unlock'}</button>
        </div>
        {wrong && <p className="feedback bad small mt">That password isn't right.</p>}
      </div>
    </div>
  )
}

function Section({ title, children, action }) {
  return (
    <div className="card mb">
      <div className="row between"><h2 style={{ margin: '0 0 6px' }}>{title}</h2>{action}</div>
      {children}
    </div>
  )
}

function ChallengesAdmin({ password, go }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  async function load() { setLoading(true); const { data } = await fetchChallenges(); setList(data); setLoading(false) }
  useEffect(() => { load() }, [])
  async function del(c) {
    if (!confirm(`Delete challenge “${c.name}” and its leaderboard?`)) return
    const { error } = await adminDeleteChallenge(c.id, password)
    if (error) alert(error.message); else load()
  }
  return (
    <Section title={`Challenges (${list.length})`} action={<button className="btn sm" onClick={() => go('challenges')}>+ Add from notes</button>}>
      {loading && <div className="empty">Loading…</div>}
      {!loading && list.length === 0 && <div className="empty">No challenges yet.</div>}
      {list.map((c) => (
        <div key={c.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
          <span>{c.name} <span className="small muted">· {(c.language || 'zulu') === 'afrikaans' ? 'Afrikaans' : 'isiZulu'} · {(c.words || []).length} words</span></span>
          <button className="icon-btn" title="Delete" onClick={() => del(c)}>✕</button>
        </div>
      ))}
    </Section>
  )
}

function SchoolsAdmin({ password }) {
  const [list, setList] = useState([])
  const [name, setName] = useState('')
  const [aliases, setAliases] = useState('')
  async function load() { const { data } = await fetchSchools(); setList(data) }
  useEffect(() => { load() }, [])
  async function add() {
    if (!name.trim()) return
    const arr = aliases.split(',').map((a) => a.trim()).filter(Boolean)
    const { error } = await adminAddSchool(name.trim(), arr, password)
    if (error) { alert(error.message); return }
    setName(''); setAliases(''); load()
  }
  async function del(s) {
    if (!confirm(`Delete school “${s.name}”? (Existing scores keep their school text.)`)) return
    const { error } = await adminDeleteSchool(s.id, password)
    if (error) alert(error.message); else load()
  }
  return (
    <Section title={`Schools (${list.length})`}>
      <p className="small muted" style={{ marginTop: 0 }}>Aliases let short forms/typos map to the right school (e.g. “SJC, st johns”).</p>
      {list.map((s) => (
        <div key={s.id} className="row between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
          <span>{s.name} {s.aliases?.length ? <span className="small muted">· {s.aliases.join(', ')}</span> : null}</span>
          <button className="icon-btn" title="Delete" onClick={() => del(s)}>✕</button>
        </div>
      ))}
      <div className="mt" style={{ display: 'grid', gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="School name — e.g. St Mary's DSG" />
        <input value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Aliases, comma-separated — e.g. st marys, smdsg" />
        <button className="btn sm" onClick={add} disabled={!name.trim()}>Add / update school</button>
      </div>
    </Section>
  )
}

function AssignSchool({ password }) {
  const [schools, setSchools] = useState([])
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => { fetchSchools().then(({ data }) => setSchools(data)) }, [])
  async function assign() {
    if (!name.trim()) return
    setMsg('')
    const { error } = await adminSetSchool(name.trim(), school, password)
    setMsg(error ? error.message : `Assigned ${name.trim()} to ${school || 'Independent'}.`)
    if (!error) setName('')
  }
  return (
    <Section title="Assign a person to a school">
      <p className="small muted" style={{ marginTop: 0 }}>Updates all of that name's leaderboard runs. Leave the school blank to make them independent.</p>
      <div style={{ display: 'grid', gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
        <input list="assign-school-list" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School (blank = independent)" />
        <datalist id="assign-school-list">{schools.map((s) => <option key={s.id} value={s.name} />)}</datalist>
        <button className="btn sm" onClick={assign} disabled={!name.trim()}>Assign</button>
        {msg && <p className="small muted">{msg}</p>}
      </div>
    </Section>
  )
}

function FeedbackAdmin({ password }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  async function load() { setLoading(true); const { data } = await adminListFeedback(password); setList(data); setLoading(false) }
  useEffect(() => { load() }, [])
  async function del(f) {
    const { error } = await adminDeleteFeedback(f.id, password)
    if (!error) setList((prev) => prev.filter((x) => x.id !== f.id))
  }
  return (
    <Section title={`Suggestions (${list.length})`} action={<button className="btn sm subtle" onClick={load}>Refresh</button>}>
      {loading && <div className="empty">Loading…</div>}
      {!loading && list.length === 0 && <div className="empty">No suggestions yet.</div>}
      {list.map((f) => (
        <div key={f.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
          <div className="row between">
            <b style={{ fontSize: '0.9rem' }}>{f.name || 'Anonymous'}</b>
            <button className="icon-btn" title="Delete" onClick={() => del(f)}>✕</button>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{f.message}</div>
          <div className="small muted mt">{new Date(f.created_at).toLocaleString()}</div>
        </div>
      ))}
    </Section>
  )
}
