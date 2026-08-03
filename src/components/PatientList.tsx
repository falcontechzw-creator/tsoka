import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PatientWithRisk, RiskLevel } from '../lib/types'
import { RISK_STYLES } from '../lib/types'

type Props = {
  onOpen: (patientId: string) => void
}

export default function PatientList({ onOpen }: Props) {
  const [patients, setPatients] = useState<PatientWithRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newClinic, setNewClinic] = useState('')
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([])

  async function load() {
    setLoading(true)
    setError('')

    const { data: pats, error: e1 } = await supabase
      .from('patients')
      .select('*')
      .order('full_name')

    if (e1) {
      setError(e1.message)
      setLoading(false)
      return
    }

    const { data: risks } = await supabase
      .from('v_patient_latest_risk')
      .select('patient_id, risk, max_asymmetry_c, computed_at')

    const riskMap = new Map(
      (risks ?? []).map((r: any) => [r.patient_id, r]),
    )

    setPatients(
      (pats ?? []).map((p: any) => {
        const r = riskMap.get(p.id)
        return {
          ...p,
          risk: (r?.risk ?? null) as RiskLevel | null,
          max_asymmetry_c: r?.max_asymmetry_c ?? null,
          last_scan: r?.computed_at ?? null,
        }
      }),
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('clinics').select('id, name').order('name').then(({ data }) => {
      const list = (data ?? []) as { id: string; name: string }[]
      setClinics(list)
      if (list.length && !newClinic) setNewClinic(list[0].id)
    })
  }, [])

  async function addPatient() {
    if (!newName.trim()) { setError('Enter a name.'); return }
    if (!newClinic) { setError('Choose a clinic.'); return }
    const { error } = await supabase.from('patients').insert({
      full_name: newName.trim(),
      phone: newPhone.trim() || null,
      clinic_id: newClinic,
    })
    if (error) { setError(error.message); return }
    setNewName(''); setNewPhone(''); setAdding(false); setError('')
    load()
  }

  const shown = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()),
  )

  // Highest risk first so the nurse sees urgent cases at the top.
  const order: Record<string, number> = { red: 0, amber: 1, green: 2 }
  shown.sort((a, b) => (order[a.risk ?? 'z'] ?? 3) - (order[b.risk ?? 'z'] ?? 3))

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <input
          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white
                     outline-none focus:ring-2 focus:ring-tsoka-mid"
          placeholder="Search patients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setAdding(!adding)}
          className="px-4 py-2.5 rounded-lg bg-tsoka-teal text-white font-medium
                     hover:opacity-90 whitespace-nowrap"
        >
          {adding ? 'Cancel' : 'Add patient'}
        </button>
      </div>

      {adding && (
        <div className="mb-5 p-4 rounded-xl bg-white border border-slate-200">
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input
              className="px-4 py-2.5 rounded-lg border border-slate-300 outline-none
                         focus:ring-2 focus:ring-tsoka-mid"
              placeholder="Full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="px-4 py-2.5 rounded-lg border border-slate-300 outline-none
                         focus:ring-2 focus:ring-tsoka-mid"
              placeholder="Phone (optional)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <select
              className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white outline-none
                         focus:ring-2 focus:ring-tsoka-mid sm:col-span-2"
              value={newClinic}
              onChange={(e) => setNewClinic(e.target.value)}
            >
              {clinics.length === 0 && <option value="">No clinics found</option>}
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addPatient}
            className="px-4 py-2 rounded-lg bg-tsoka-warm text-white font-medium hover:opacity-90"
          >
            Save patient
          </button>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {loading && <p className="text-slate-500 text-sm">Loading patients…</p>}

      {!loading && shown.length === 0 && (
        <div className="text-center py-12 rounded-xl bg-white border border-slate-200">
          <p className="text-slate-600 font-medium">No patients yet</p>
          <p className="text-slate-500 text-sm mt-1">Add your first patient to begin screening.</p>
        </div>
      )}

      <div className="space-y-2">
        {shown.map((p) => {
          const style = p.risk ? RISK_STYLES[p.risk] : null
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p.id)}
              className="w-full text-left bg-white rounded-xl px-4 py-3.5 border border-slate-200
                         hover:border-tsoka-mid transition flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-tsoka-deep truncate">{p.full_name}</p>
                <p className="text-sm text-slate-500">
                  {p.last_scan
                    ? `Last screened ${new Date(p.last_scan).toLocaleDateString()}`
                    : 'Not yet screened'}
                </p>
              </div>
              {style ? (
                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              ) : (
                <span className="shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                  No scan
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

