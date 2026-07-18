import { useEffect, useState } from 'react'
import { useVocab } from '../context/VocabContext'
import { fetchSchools, isSupabaseConfigured } from '../lib/supabase'
import { normalizeSchool } from '../lib/schools'

export default function NameModal({ onClose }) {
  const { displayName, setDisplayName, school, setSchool } = useVocab()
  const [name, setName] = useState(displayName || '')
  const [indep, setIndep] = useState(!school && !!displayName ? true : false)
  const [schoolText, setSchoolText] = useState(school || '')
  const [schools, setSchools] = useState([])

  useEffect(() => {
    if (isSupabaseConfigured) fetchSchools().then(({ data }) => setSchools(data))
  }, [])

  function submit(e) {
    e.preventDefault()
    setDisplayName(name)
    if (indep) setSchool('')
    else setSchool(normalizeSchool(schoolText, schools))
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Your details</h2>
        <p className="subtitle">
          Your name shows on the leaderboard. Add your school to compete on the
          school boards too — or mark yourself independent.
        </p>
        <div className="field">
          <label>Display name</label>
          <input autoFocus value={name} maxLength={24} placeholder="e.g. Thabo M" onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <label>School</label>
          <label className="check">
            <input type="checkbox" checked={indep} onChange={(e) => setIndep(e.target.checked)} style={{ width: 'auto' }} />
            I'm independent (no school)
          </label>
          {!indep && (
            <>
              <input
                list="school-list"
                value={schoolText}
                maxLength={60}
                placeholder="Start typing… e.g. SJC, St Kaths"
                onChange={(e) => setSchoolText(e.target.value)}
                style={{ marginTop: 8 }}
              />
              <datalist id="school-list">
                {schools.map((s) => <option key={s.id} value={s.name} />)}
              </datalist>
              <p className="small muted mt">Short forms and typos are matched to the right school automatically.</p>
            </>
          )}
        </div>

        <div className="row between mt">
          <button type="button" className="btn subtle" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={!name.trim()}>Save</button>
        </div>
      </form>
    </div>
  )
}
