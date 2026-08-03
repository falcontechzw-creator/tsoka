import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PatientWithRisk, RiskLevel } from '../lib/types'
import {
  RISK_STYLES, initials, shortId, ageFrom, formatDate, daysSince, avatarTint,
} from '../lib/types'
import {
  Search, SlidersHorizontal, Plus, ChevronRight, ChevronLeft,
  AlertTriangle, ShieldCheck, AlertCircle, Wifi, X,
} from 'lucide-react'

type Props = { onOpen: (patientId: string) => void }

type AlertRow = {
  id: string
  patient_id: string
  message: string | null
  created_at: string
}

const PAGE_SIZE = 6

export default function PatientsPage({ onOpen }: Props) {
  const [patients, setPatients] = useState<PatientWithRisk[]>([])
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all')
  const [showFilter, setShowFilter] = useState(false)
  const [page, setPage] = useState(1)

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newDob, setNewDob] = useState('')
  const [newType, setNewType] = useState('type 2')
  const [newClinic, setNewClinic] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    const [p, r, a] = await Promise.all([
      supabase.from('patients').select('*').order('full_name'),
      supabase.from('v_patient_latest_risk')
        .select('patient_id, risk, max_asymmetry_c, computed_at'),
      supabase.from('alerts').select('id, patient_id, message, created_at')
        .eq('status', 'open').order('created_at', { ascending: false }),
    ])

    if (p.error) { setError(p.error.message); setLoading(false); return }

    const riskMap = new Map((r.data ?? []).map((x: any) => [x.patient_id, x]))
    setPatients((p.data ?? []).map((x: any) => {
      const m = riskMap.get(x.id)
      return {
        ...x,
        risk: (m?.risk ?? null) as RiskLevel | null,
        max_asymmetry_c: m?.max_asymmetry_c ?? null,
        last_scan: m?.computed_at ?? null,
      }
    }))
    setAlerts((a.data ?? []) as AlertRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('clinics').select('id, name').order('name').then(({ data }) => {
      const list = (data ?? []) as { id: string; name: string }[]
      setClinics(list)
      if (list.length) setNewClinic((c) => c || list[0].id)
    })
  }, [])

  async function addPatient() {
    if (!newName.trim()) { setError('Enter a name.'); return }
    if (!newClinic) { setError('Choose a clinic.'); return }
    const { error } = await supabase.from('patients').insert({
      full_name: newName.trim(),
      phone: newPhone.trim() || null,
      date_of_birth: newDob || null,
      diabetes_type: newType || null,
      clinic_id: newClinic,
    })
    if (error) { setError(error.message); return }
    setNewName(''); setNewPhone(''); setNewDob(''); setAdding(false); setError('')
    load()
  }

  async function acknowledge(id: string) {
    await supabase.from('alerts')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', id)
    load()
  }

  const nameById = useMemo(
    () => Object.fromEntries(patients.map((p) => [p.id, p.full_name])),
    [patients],
  )

  const filtered = useMemo(() => {
    const order: Record<string, number> = { red: 0, amber: 1, green: 2 }
    return patients
      .filter((p) => {
        const q = search.toLowerCase().trim()
        const matches = !q
          || p.full_name.toLowerCase().includes(q)
          || shortId(p.id).toLowerCase().includes(q)
        return matches && (filter === 'all' || p.risk === filter)
      })
      .sort((a, b) => (order[a.risk ?? 'z'] ?? 3) - (order[b.risk ?? 'z'] ?? 3))
  }, [patients, search, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const counts = {
    red: patients.filter((p) => p.risk === 'red').length,
    amber: patients.filter((p) => p.risk === 'amber').length,
    green: patients.filter((p) => p.risk === 'green').length,
  }
  const scored = counts.red + counts.amber + counts.green
  const pct = (n: number) => (scored ? ((n / scored) * 100).toFixed(1) : '0.0')

  const overdue = patients
    .map((p) => ({ ...p, days: daysSince(p.last_scan) }))
    .filter((p) => p.days === null || p.days > 60)
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patients</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Highest risk first. Select a patient to screen or review.
        </p>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        {/* ---------------- main column ---------------- */}
        <div>
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search patients by name or ID"
                aria-label="Search patients"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-slate-200
                           text-sm text-slate-900 placeholder-slate-400 shadow-sm
                           outline-none focus:ring-2 focus:ring-tsoka-mid/40
                           focus:border-tsoka-mid transition"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white
                           border border-slate-200 text-sm font-medium text-slate-700
                           shadow-sm hover:bg-slate-50 transition"
              >
                <SlidersHorizontal size={16} />
                {filter === 'all' ? 'Filter' : RISK_STYLES[filter].label}
              </button>
              {showFilter && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border
                                border-slate-200 shadow-lg p-1.5 z-10">
                  {([['all', 'All patients'], ['red', 'High risk'],
                     ['amber', 'Moderate risk'], ['green', 'Low risk']] as const).map(
                    ([k, label]) => (
                      <button
                        key={k}
                        onClick={() => { setFilter(k as any); setShowFilter(false); setPage(1) }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition
                          ${filter === k
                            ? 'bg-tsoka-deep text-white'
                            : 'text-slate-700 hover:bg-slate-100'}`}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setAdding(!adding)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tsoka-deep
                         text-white text-sm font-semibold shadow-sm hover:bg-tsoka-teal
                         transition"
            >
              {adding ? <X size={16} /> : <Plus size={16} />}
              {adding ? 'Cancel' : 'Add patient'}
            </button>
          </div>

          {/* add patient */}
          {adding && (
            <div className="mb-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <h2 className="font-semibold text-slate-900 mb-4">New patient</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ['Full name', newName, setNewName, 'text', 'Tendai Moyo'],
                  ['Phone', newPhone, setNewPhone, 'text', '+263 …'],
                  ['Date of birth', newDob, setNewDob, 'date', ''],
                ].map(([label, val, set, type, ph]: any) => (
                  <label key={label} className="text-sm">
                    <span className="block text-slate-500 text-xs mb-1.5 font-medium">
                      {label}
                    </span>
                    <input
                      type={type} value={val} placeholder={ph}
                      onChange={(e) => set(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200
                                 text-sm outline-none focus:ring-2 focus:ring-tsoka-mid/40
                                 focus:border-tsoka-mid transition"
                    />
                  </label>
                ))}
                <label className="text-sm">
                  <span className="block text-slate-500 text-xs mb-1.5 font-medium">
                    Diabetes type
                  </span>
                  <select
                    value={newType} onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white
                               text-sm outline-none focus:ring-2 focus:ring-tsoka-mid/40"
                  >
                    <option value="type 1">Type 1</option>
                    <option value="type 2">Type 2</option>
                    <option value="gestational">Gestational</option>
                  </select>
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="block text-slate-500 text-xs mb-1.5 font-medium">Clinic</span>
                  <select
                    value={newClinic} onChange={(e) => setNewClinic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white
                               text-sm outline-none focus:ring-2 focus:ring-tsoka-mid/40"
                  >
                    {clinics.length === 0 && <option value="">No clinics found</option>}
                    {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              </div>
              <button
                onClick={addPatient}
                className="mt-4 px-4 py-2.5 rounded-xl bg-tsoka-warm text-white text-sm
                           font-semibold hover:opacity-90 transition"
              >
                Save patient
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3
                            text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* list */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {loading && (
              <p className="px-5 py-8 text-sm text-slate-500">Loading patients…</p>
            )}

            {!loading && shown.length === 0 && (
              <div className="px-5 py-14 text-center">
                <p className="font-medium text-slate-700">No patients match</p>
                <p className="text-sm text-slate-500 mt-1">
                  Try a different search or clear the filter.
                </p>
              </div>
            )}

            <ul className="divide-y divide-slate-100">
              {shown.map((p) => {
                const s = p.risk ? RISK_STYLES[p.risk] : null
                const age = ageFrom(p.date_of_birth)
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => onOpen(p.id)}
                      className="w-full text-left flex items-center gap-4 px-5 py-4
                                 hover:bg-slate-50/80 transition group"
                    >
                      <span className={`w-1 self-stretch rounded-full shrink-0
                        ${s ? s.bar : 'bg-slate-200'}`} />
                      <span className={`w-11 h-11 rounded-full grid place-items-center
                                        text-sm font-bold shrink-0 ${avatarTint(p.id)}`}>
                        {initials(p.full_name)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900 truncate">
                          {p.full_name}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {shortId(p.id)}{age !== null && ` · Age ${age}`}
                          {p.diabetes_type && ` · ${p.diabetes_type}`}
                        </span>
                        <span className="block text-xs text-slate-400 mt-0.5">
                          Last screened: {formatDate(p.last_scan)}
                        </span>
                      </span>

                      {s ? (
                        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold
                                          ring-1 ${s.bg} ${s.text} ${s.ring}`}>
                          {s.label}
                        </span>
                      ) : (
                        <span className="shrink-0 px-3 py-1 rounded-full text-xs font-medium
                                         bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                          No scan
                        </span>
                      )}

                      <ChevronRight size={18}
                        className="shrink-0 text-slate-300 group-hover:text-slate-500 transition" />
                    </button>
                  </li>
                )
              })}
            </ul>

            {filtered.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-5 py-3.5
                              border-t border-slate-100 bg-slate-50/60">
                <p className="text-xs text-slate-500">
                  Showing {(current - 1) * PAGE_SIZE + 1}–
                  {Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, current - 1))}
                    disabled={current === 1}
                    aria-label="Previous page"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white
                               disabled:opacity-30 disabled:hover:bg-transparent transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === pageCount || Math.abs(n - current) <= 1)
                    .map((n, i, arr) => (
                      <span key={n} className="flex items-center">
                        {i > 0 && arr[i - 1] !== n - 1 && (
                          <span className="px-1 text-slate-400 text-xs">…</span>
                        )}
                        <button
                          onClick={() => setPage(n)}
                          aria-current={n === current ? 'page' : undefined}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition
                            ${n === current
                              ? 'bg-tsoka-deep text-white'
                              : 'text-slate-600 hover:bg-white'}`}
                        >
                          {n}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => setPage(Math.min(pageCount, current + 1))}
                    disabled={current === pageCount}
                    aria-label="Next page"
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-white
                               disabled:opacity-30 disabled:hover:bg-transparent transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* connected mat hint */}
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-tsoka-deep to-tsoka-teal
                          p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center shrink-0">
              <Wifi size={20} className="text-tsoka-warm" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm">Using the connected mat</p>
              <p className="text-white/60 text-sm mt-1 leading-relaxed">
                Place the mat on a flat surface and ask the patient to stand barefoot.
                Open a patient, then choose <span className="text-white/90">Use the mat</span> to
                capture readings automatically.
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- right rail ---------------- */}
        <aside className="space-y-4">
          {/* risk summary */}
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Risk summary</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {([
                ['red', AlertTriangle, counts.red],
                ['amber', AlertCircle, counts.amber],
                ['green', ShieldCheck, counts.green],
              ] as const).map(([k, Icon, n]) => {
                const s = RISK_STYLES[k]
                return (
                  <div key={k} className={`rounded-xl p-3 ring-1 ${s.bg} ${s.ring}`}>
                    <Icon size={15} className={s.text} />
                    <p className={`text-xs font-semibold mt-1.5 ${s.text}`}>{s.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 leading-none">{n}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{pct(n)}%</p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* open alerts */}
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">Open alerts</h2>
              {alerts.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full
                                 bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                  {alerts.length}
                </span>
              )}
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500">
                No open alerts. Everything screened is within range.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {alerts.slice(0, 3).map((a) => (
                  <li key={a.id}
                      className="border-l-2 border-rose-400 pl-3 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => onOpen(a.patient_id)}
                        className="font-semibold text-sm text-slate-900 hover:text-tsoka-teal
                                   truncate block text-left"
                      >
                        {nameById[a.patient_id] ?? 'Patient'}
                      </button>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{a.message}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(a.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => acknowledge(a.id)}
                      className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg
                                 border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                    >
                      Acknowledge
                    </button>
                  </li>
                ))}
                {alerts.length > 3 && (
                  <li className="text-xs text-tsoka-teal font-medium pt-1">
                    + {alerts.length - 3} more
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* overdue */}
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Not screened in 60 days</h2>
            {overdue.length === 0 ? (
              <p className="text-sm text-slate-500">Everyone is up to date.</p>
            ) : (
              <ul className="space-y-2.5">
                {overdue.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => onOpen(p.id)}
                      className="min-w-0 text-left"
                    >
                      <span className="block text-sm font-medium text-slate-900 truncate
                                       hover:text-tsoka-teal">
                        {p.full_name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        Last screened: {formatDate(p.last_scan)}
                      </span>
                    </button>
                    <span className="shrink-0 text-xs text-slate-400">
                      {p.days === null ? 'Never' : `${p.days} days`}
                    </span>
                  </li>
                ))}
                {overdue.length > 4 && (
                  <li className="text-xs text-tsoka-teal font-medium pt-1">
                    + {overdue.length - 4} more patients
                  </li>
                )}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
