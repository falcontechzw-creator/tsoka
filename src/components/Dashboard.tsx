import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RiskLevel } from '../lib/types'
import { RISK_STYLES, formatDate, daysSince } from '../lib/types'
import {
  Users, AlertTriangle, AlertCircle, ShieldCheck, CalendarClock, Activity,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'

type ClinicRow = {
  clinic_id: string
  clinic_name: string
  red_count: number
  amber_count: number
  green_count: number
  total_patients: number
}

type AlertRow = {
  id: string
  patient_id: string
  message: string | null
  created_at: string
}

type Props = { onOpenPatient: (id: string) => void }

const RISK_HEX: Record<RiskLevel, string> = {
  red: '#E11D48',
  amber: '#F59E0B',
  green: '#10B981',
}

export default function Dashboard({ onOpenPatient }: Props) {
  const [clinics, setClinics] = useState<ClinicRow[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [risks, setRisks] = useState<{ risk: RiskLevel; clinic_id: string | null }[]>([])
  const [monthly, setMonthly] = useState<{ month: string; scans: number }[]>([])
  const [overdue, setOverdue] = useState<
    { patient_id: string; full_name: string; last_scan: string | null }[]
  >([])
  const [recent, setRecent] = useState<
    { id: string; patient_id: string; risk: RiskLevel; computed_at: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const [c, m, a, p, r, scans, rec] = await Promise.all([
      supabase.from('v_clinic_risk_summary').select('*')
        .order('red_count', { ascending: false }),
      supabase.from('v_missed_followups').select('*'),
      supabase.from('alerts').select('id, patient_id, message, created_at')
        .eq('status', 'open').order('created_at', { ascending: false }).limit(20),
      supabase.from('patients').select('id, full_name'),
      supabase.from('v_patient_latest_risk').select('risk, clinic_id'),
      supabase.from('scans').select('scanned_at').order('scanned_at'),
      supabase.from('risk_assessments')
        .select('id, patient_id, risk, computed_at')
        .order('computed_at', { ascending: false }).limit(6),
    ])

    if (c.error) setError(c.error.message)
    setClinics((c.data ?? []) as ClinicRow[])
    setOverdue((m.data ?? []) as any[])
    setAlerts((a.data ?? []) as AlertRow[])
    setNames(Object.fromEntries((p.data ?? []).map((x: any) => [x.id, x.full_name])))
    setRisks((r.data ?? []) as any[])
    setRecent((rec.data ?? []) as any[])

    // Screenings per month, derived from real scan timestamps.
    const buckets = new Map<string, number>()
    ;(scans.data ?? []).forEach((s: any) => {
      const d = new Date(s.scanned_at)
      const key = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    })
    setMonthly([...buckets.entries()].slice(-6).map(([month, scans]) => ({ month, scans })))

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function acknowledge(id: string) {
    await supabase.from('alerts')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', id)
    load()
  }

  const counts = {
    red: risks.filter((r) => r.risk === 'red').length,
    amber: risks.filter((r) => r.risk === 'amber').length,
    green: risks.filter((r) => r.risk === 'green').length,
  }
  const screened = risks.length
  const unassigned = risks.filter((r) => !r.clinic_id).length

  const kpis = [
    { label: 'Patients screened', value: screened, Icon: Users, tone: 'text-slate-900',
      chip: 'bg-slate-100 text-slate-600' },
    { label: 'High risk', value: counts.red, Icon: AlertTriangle, tone: 'text-rose-600',
      chip: 'bg-rose-50 text-rose-600' },
    { label: 'Moderate risk', value: counts.amber, Icon: AlertCircle, tone: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600' },
    { label: 'Low risk', value: counts.green, Icon: ShieldCheck, tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600' },
    { label: 'Open alerts', value: alerts.length, Icon: Activity, tone: 'text-rose-600',
      chip: 'bg-rose-50 text-rose-600' },
    { label: 'Overdue screening', value: overdue.length, Icon: CalendarClock,
      tone: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
  ]

  const pieData = ([
    ['High risk', counts.red, RISK_HEX.red],
    ['Moderate risk', counts.amber, RISK_HEX.amber],
    ['Low risk', counts.green, RISK_HEX.green],
  ] as const).filter(([, v]) => v > 0)
    .map(([name, value, fill]) => ({ name, value, fill }))

  const clinicData = clinics.map((c) => ({
    name: c.clinic_name.replace(/ (Clinic|Polyclinic|Health Centre)$/, ''),
    High: Number(c.red_count),
    Moderate: Number(c.amber_count),
    Low: Number(c.green_count),
  }))

  const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Screening activity and risk across all clinics.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3
                        text-sm text-rose-700">{error}</div>
      )}
      {loading && <p className="text-sm text-slate-500 mb-4">Loading…</p>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {kpis.map(({ label, value, Icon, tone, chip }) => (
          <div key={label} className={`${card} p-4`}>
            <div className={`w-8 h-8 rounded-lg grid place-items-center ${chip}`}>
              <Icon size={16} />
            </div>
            <p className={`text-3xl font-bold mt-3 leading-none ${tone}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="space-y-6">
          {/* monthly trend */}
          <section className={`${card} p-5`}>
            <h2 className="font-semibold text-slate-900 mb-1">Screenings per month</h2>
            <p className="text-xs text-slate-500 mb-4">Total scans recorded.</p>
            {monthly.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No scans recorded yet.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0E7C86" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#0E7C86" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F2" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B3' }}
                           axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B3' }}
                           axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      }}
                    />
                    <Area type="monotone" dataKey="scans" stroke="#0E7C86" strokeWidth={2.5}
                          fill="url(#scanFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* clinic comparison */}
          <section className={`${card} p-5`}>
            <h2 className="font-semibold text-slate-900 mb-1">Clinic comparison</h2>
            <p className="text-xs text-slate-500 mb-4">Screened patients by risk level.</p>
            {unassigned > 0 && (
              <p className="mb-3 text-xs text-amber-800 bg-amber-50 ring-1 ring-amber-200
                            rounded-lg px-3 py-2">
                {unassigned} screened {unassigned === 1 ? 'patient is' : 'patients are'} not
                assigned to a clinic.
              </p>
            )}
            {clinicData.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No clinic data yet.</p>
            ) : (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clinicData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F2" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B3' }}
                           axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B3' }}
                           axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#F8FAFA' }}
                      contentStyle={{
                        borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      }}
                    />
                    <Bar dataKey="High" stackId="a" fill={RISK_HEX.red} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Moderate" stackId="a" fill={RISK_HEX.amber} />
                    <Bar dataKey="Low" stackId="a" fill={RISK_HEX.green} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* recent activity */}
          <section className={`${card} p-5`}>
            <h2 className="font-semibold text-slate-900 mb-4">Recent activity</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {recent.map((r) => {
                  const s = RISK_STYLES[r.risk]
                  return (
                    <li key={r.id} className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.bar}`} />
                      <button
                        onClick={() => onOpenPatient(r.patient_id)}
                        className="text-sm font-medium text-slate-900 hover:text-tsoka-teal
                                   truncate"
                      >
                        {names[r.patient_id] ?? 'Patient'}
                      </button>
                      <span className="text-sm text-slate-500 truncate">
                        screened · {s.label.toLowerCase()}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 shrink-0">
                        {new Date(r.computed_at).toLocaleString(undefined, {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* right rail */}
        <aside className="space-y-4">
          <section className={`${card} p-5`}>
            <h2 className="font-semibold text-slate-900 mb-1">Risk distribution</h2>
            <p className="text-xs text-slate-500 mb-2">Across all screened patients.</p>
            {pieData.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No scans yet.</p>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name"
                           innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                        {pieData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1.5 mt-2">
                  {pieData.map((d) => (
                    <li key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full"
                            style={{ background: d.fill }} />
                      <span className="text-slate-600">{d.name}</span>
                      <span className="ml-auto font-semibold text-slate-900">{d.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className={`${card} p-5`}>
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
              <p className="text-sm text-slate-500">No open alerts.</p>
            ) : (
              <ul className="space-y-2.5">
                {alerts.slice(0, 4).map((a) => (
                  <li key={a.id}
                      className="border-l-2 border-rose-400 pl-3 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => onOpenPatient(a.patient_id)}
                        className="font-semibold text-sm text-slate-900 hover:text-tsoka-teal
                                   truncate block text-left"
                      >
                        {names[a.patient_id] ?? 'Patient'}
                      </button>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{a.message}</p>
                    </div>
                    <button
                      onClick={() => acknowledge(a.id)}
                      className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg
                                 border border-rose-200 text-rose-600 hover:bg-rose-50
                                 transition"
                    >
                      Acknowledge
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${card} p-5`}>
            <h2 className="font-semibold text-slate-900 mb-3">Overdue for screening</h2>
            {overdue.length === 0 ? (
              <p className="text-sm text-slate-500">Everyone is up to date.</p>
            ) : (
              <ul className="space-y-2.5">
                {overdue.slice(0, 5).map((o) => {
                  const d = daysSince(o.last_scan)
                  return (
                    <li key={o.patient_id} className="flex items-center justify-between gap-3">
                      <button onClick={() => onOpenPatient(o.patient_id)} className="min-w-0 text-left">
                        <span className="block text-sm font-medium text-slate-900 truncate
                                         hover:text-tsoka-teal">
                          {o.full_name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          Last screened: {formatDate(o.last_scan)}
                        </span>
                      </button>
                      <span className="shrink-0 text-xs text-slate-400">
                        {d === null ? 'Never' : `${d} days`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
