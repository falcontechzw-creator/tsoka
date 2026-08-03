import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Vital = {
  id: string
  recorded_at: string
  glucose_mmol: number | null
  systolic: number | null
  diastolic: number | null
  weight_kg: number | null
  meds_taken: boolean | null
  source: string | null
}

type Props = { patientId: string }

/** Rough guidance bands, used only to colour the reading, never to diagnose. */
function glucoseTone(v: number | null) {
  if (v == null) return 'text-slate-400'
  if (v < 4) return 'text-amber-600'
  if (v <= 7.8) return 'text-emerald-600'
  if (v <= 11) return 'text-amber-600'
  return 'text-red-600'
}

function bpTone(sys: number | null, dia: number | null) {
  if (sys == null || dia == null) return 'text-slate-400'
  if (sys >= 140 || dia >= 90) return 'text-red-600'
  if (sys >= 130 || dia >= 85) return 'text-amber-600'
  return 'text-emerald-600'
}

export default function Vitals({ patientId }: Props) {
  const [rows, setRows] = useState<Vital[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [glucose, setGlucose] = useState('')
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [weight, setWeight] = useState('')
  const [meds, setMeds] = useState(true)

  async function load() {
    const { data, error } = await supabase
      .from('vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(12)
    if (error) setError(error.message)
    setRows((data ?? []) as Vital[])
  }

  useEffect(() => { load() }, [patientId])

  async function save() {
    if (!glucose && !systolic && !weight) {
      setError('Enter at least one reading.')
      return
    }
    setSaving(true)
    setError('')
    const { error } = await supabase.from('vitals').insert({
      patient_id: patientId,
      glucose_mmol: glucose ? Number(glucose) : null,
      systolic: systolic ? Number(systolic) : null,
      diastolic: diastolic ? Number(diastolic) : null,
      weight_kg: weight ? Number(weight) : null,
      meds_taken: meds,
      source: 'app',
    })
    if (error) { setError(error.message); setSaving(false); return }
    setGlucose(''); setSystolic(''); setDiastolic(''); setWeight('')
    setOpen(false)
    setSaving(false)
    load()
  }

  const latest = rows[0]

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-tsoka-deep">Daily readings</h3>
        <button
          onClick={() => setOpen(!open)}
          className="text-sm font-medium text-tsoka-teal hover:underline"
        >
          {open ? 'Cancel' : 'Log reading'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {open && (
        <div className="mb-4 p-4 rounded-xl bg-white border border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <label className="text-sm">
              <span className="block text-slate-500 mb-1 text-xs">Glucose (mmol/L)</span>
              <input
                type="number" step="0.1" inputMode="decimal"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none
                           focus:ring-2 focus:ring-tsoka-mid"
                value={glucose} onChange={(e) => setGlucose(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500 mb-1 text-xs">Systolic</span>
              <input
                type="number" inputMode="numeric"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none
                           focus:ring-2 focus:ring-tsoka-mid"
                value={systolic} onChange={(e) => setSystolic(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500 mb-1 text-xs">Diastolic</span>
              <input
                type="number" inputMode="numeric"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none
                           focus:ring-2 focus:ring-tsoka-mid"
                value={diastolic} onChange={(e) => setDiastolic(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-500 mb-1 text-xs">Weight (kg)</span>
              <input
                type="number" step="0.1" inputMode="decimal"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none
                           focus:ring-2 focus:ring-tsoka-mid"
                value={weight} onChange={(e) => setWeight(e.target.value)}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 mb-4 text-sm text-slate-700">
            <input
              type="checkbox" checked={meds}
              onChange={(e) => setMeds(e.target.checked)}
              className="w-4 h-4 accent-tsoka-teal"
            />
            Medication taken today
          </label>

          <button
            onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg bg-tsoka-teal text-white font-medium
                       hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save reading'}
          </button>
        </div>
      )}

      {latest && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className={`text-2xl font-bold ${glucoseTone(latest.glucose_mmol)}`}>
              {latest.glucose_mmol ?? '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Glucose mmol/L</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className={`text-2xl font-bold ${bpTone(latest.systolic, latest.diastolic)}`}>
              {latest.systolic && latest.diastolic
                ? `${latest.systolic}/${latest.diastolic}`
                : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Blood pressure</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-2xl font-bold text-tsoka-deep">
              {latest.weight_kg ?? '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Weight kg</p>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 px-4 py-5">
          No readings logged yet.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                <th className="text-center px-2 py-2.5 font-semibold">Glucose</th>
                <th className="text-center px-2 py-2.5 font-semibold">BP</th>
                <th className="text-center px-2 py-2.5 font-semibold">Weight</th>
                <th className="text-center px-2 py-2.5 font-semibold">Meds</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 text-slate-600">
                    {new Date(v.recorded_at).toLocaleDateString()}
                  </td>
                  <td className={`text-center px-2 py-2.5 font-medium ${glucoseTone(v.glucose_mmol)}`}>
                    {v.glucose_mmol ?? '—'}
                  </td>
                  <td className={`text-center px-2 py-2.5 font-medium ${bpTone(v.systolic, v.diastolic)}`}>
                    {v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : '—'}
                  </td>
                  <td className="text-center px-2 py-2.5 text-slate-600">
                    {v.weight_kg ?? '—'}
                  </td>
                  <td className="text-center px-2 py-2.5">
                    {v.meds_taken == null
                      ? <span className="text-slate-400">—</span>
                      : v.meds_taken
                        ? <span className="text-emerald-600 font-medium">Yes</span>
                        : <span className="text-red-600 font-medium">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
