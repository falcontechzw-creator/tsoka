import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/types'
import { ClipboardList, Pencil, Check, X, CalendarClock, TriangleAlert } from 'lucide-react'

type Fields = {
  medical_history: string | null
  allergies: string | null
  diagnosed_year: number | null
  next_appointment: string | null
  diabetes_type: string | null
}

type Props = { patientId: string }

export default function MedicalHistory({ patientId }: Props) {
  const [f, setF] = useState<Fields | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Fields | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('patients')
      .select('medical_history, allergies, diagnosed_year, next_appointment, diabetes_type')
      .eq('id', patientId)
      .single()
    if (error) setError(error.message)
    setF(data as Fields)
  }

  useEffect(() => { load() }, [patientId])

  function startEdit() {
    setDraft(f)
    setEditing(true)
    setError('')
  }

  async function save() {
    if (!draft) return
    setSaving(true); setError('')
    const { error } = await supabase.from('patients').update({
      medical_history: draft.medical_history?.trim() || null,
      allergies: draft.allergies?.trim() || null,
      diagnosed_year: draft.diagnosed_year || null,
      next_appointment: draft.next_appointment || null,
      diabetes_type: draft.diabetes_type || null,
    }).eq('id', patientId)
    if (error) { setError(error.message); setSaving(false); return }
    setSaving(false); setEditing(false); load()
  }

  const upcoming = f?.next_appointment
    ? new Date(f.next_appointment) >= new Date(new Date().toDateString())
    : false

  const label = 'block text-xs font-medium text-slate-500 mb-1.5'
  const input = `w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                 outline-none focus:ring-2 focus:ring-tsoka-mid/40 focus:border-tsoka-mid
                 transition`

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList size={17} className="text-tsoka-teal" />
        <h3 className="font-semibold text-slate-900">Medical history</h3>
        <div className="ml-auto">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                           font-medium text-slate-500 hover:bg-slate-100 transition"
              >
                <X size={13} /> Cancel
              </button>
              <button
                onClick={save} disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-tsoka-deep
                           text-white text-xs font-semibold hover:bg-tsoka-teal
                           disabled:opacity-50 transition"
              >
                <Check size={13} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
                         font-medium text-tsoka-teal hover:bg-slate-100 transition"
            >
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}

      {editing && draft ? (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <label>
              <span className={label}>Diabetes type</span>
              <select
                value={draft.diabetes_type ?? ''}
                onChange={(e) => setDraft({ ...draft, diabetes_type: e.target.value })}
                className={`${input} bg-white`}
              >
                <option value="">Not recorded</option>
                <option value="type 1">Type 1</option>
                <option value="type 2">Type 2</option>
                <option value="gestational">Gestational</option>
              </select>
            </label>
            <label>
              <span className={label}>Diagnosed year</span>
              <input
                type="number" inputMode="numeric" placeholder="2016"
                value={draft.diagnosed_year ?? ''}
                onChange={(e) => setDraft({
                  ...draft,
                  diagnosed_year: e.target.value ? Number(e.target.value) : null,
                })}
                className={input}
              />
            </label>
            <label>
              <span className={label}>Next appointment</span>
              <input
                type="date"
                value={draft.next_appointment ?? ''}
                onChange={(e) => setDraft({ ...draft, next_appointment: e.target.value })}
                className={input}
              />
            </label>
          </div>

          <label className="block">
            <span className={label}>Allergies</span>
            <input
              placeholder="Penicillin, sulfa drugs…"
              value={draft.allergies ?? ''}
              onChange={(e) => setDraft({ ...draft, allergies: e.target.value })}
              className={input}
            />
          </label>

          <label className="block">
            <span className={label}>History and conditions</span>
            <textarea
              rows={4}
              placeholder="Previous ulcers, neuropathy, peripheral vascular disease, smoking history, prior surgery…"
              value={draft.medical_history ?? ''}
              onChange={(e) => setDraft({ ...draft, medical_history: e.target.value })}
              className={`${input} resize-y`}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              ['Diabetes type', f?.diabetes_type ?? '—'],
              ['Diagnosed', f?.diagnosed_year ? String(f.diagnosed_year) : '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 px-3.5 py-3">
                <p className="text-xs text-slate-500">{k}</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5 capitalize">{v}</p>
              </div>
            ))}
            <div className={`rounded-xl px-3.5 py-3 ${
              upcoming ? 'bg-teal-50 ring-1 ring-teal-200' : 'bg-slate-50'}`}>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <CalendarClock size={12} /> Next appointment
              </p>
              <p className={`text-sm font-semibold mt-0.5 ${
                upcoming ? 'text-teal-800' : 'text-slate-900'}`}>
                {formatDate(f?.next_appointment ?? null)}
              </p>
            </div>
          </div>

          {f?.allergies && (
            <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-3
                            flex items-start gap-2">
              <TriangleAlert size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Allergies</p>
                <p className="text-sm text-amber-900 mt-0.5">{f.allergies}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">History and conditions</p>
            {f?.medical_history ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {f.medical_history}
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                Nothing recorded. Select Edit to add history.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
