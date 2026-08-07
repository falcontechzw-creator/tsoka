import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { initials, avatarTint, formatDate, RISK_STYLES } from '../lib/types'
import type { RiskLevel } from '../lib/types'
import {
  Bell, Check, Clock, CircleCheck, Loader2, ChevronRight, X, Stethoscope,
} from 'lucide-react'

type Alert = {
  id: string
  patient_id: string
  message: string | null
  status: 'open' | 'acknowledged' | 'reviewed'
  created_at: string
  acknowledged_at: string | null
  acknowledged_by: string | null
  action_taken: string | null
  resolution_note: string | null
  resolved_at: string | null
}

type Props = { onOpenPatient: (id: string) => void }

const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm'

const ACTIONS = [
  'Patient contacted by phone',
  'Appointment brought forward',
  'Reviewed in clinic today',
  'Referred to the diabetic foot clinic',
  'Advised offloading and daily inspection',
  'Monitoring, will rescan next visit',
]

export default function AlertsPage({ onOpenPatient }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [risks, setRisks] = useState<Record<string, RiskLevel>>({})
  const [staff, setStaff] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'open' | 'acknowledged' | 'reviewed'>('open')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [openForm, setOpenForm] = useState<string | null>(null)
  const [action, setAction] = useState('')
  const [outcome, setOutcome] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    const [a, p, r, pr] = await Promise.all([
      supabase.from('alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('patients').select('id, full_name'),
      supabase.from('v_patient_latest_risk').select('patient_id, risk'),
      supabase.from('profiles').select('id, full_name'),
    ])
    if (a.error) setError(a.error.message)
    setAlerts((a.data ?? []) as Alert[])
    setNames(Object.fromEntries((p.data ?? []).map((x: any) => [x.id, x.full_name])))
    setRisks(Object.fromEntries((r.data ?? []).map((x: any) => [x.patient_id, x.risk])))
    setStaff(Object.fromEntries((pr.data ?? []).map((x: any) => [x.id, x.full_name])))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function acknowledge(id: string) {
    if (!action.trim()) { setError('Choose or type what you will do about it.'); return }
    setBusy(true); setError('')
    const { error } = await supabase.rpc('acknowledge_alert', {
      p_alert_id: id, p_action: action.trim(),
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setOpenForm(null); setAction(''); load()
  }

  async function resolve(id: string) {
    const note = (outcome[id] ?? '').trim()
    if (!note) { setError('Record what happened when the patient was seen.'); return }
    setBusy(true); setError('')
    const { error } = await supabase.rpc('resolve_alert', {
      p_alert_id: id, p_outcome: note,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setOutcome({ ...outcome, [id]: '' }); load()
  }

  const counts = useMemo(() => ({
    open: alerts.filter((a) => a.status === 'open').length,
    acknowledged: alerts.filter((a) => a.status === 'acknowledged').length,
    reviewed: alerts.filter((a) => a.status === 'reviewed').length,
  }), [alerts])

  const shown = alerts.filter((a) => a.status === tab)

  /** How long an open alert has been sitting there. */
  function waitingDays(iso: string) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alerts</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Patients the screening flagged for review.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3
                        text-sm text-rose-700 flex items-start gap-2.5">
          <X size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto opacity-60">
            <X size={15} />
          </button>
        </div>
      )}

      {/* what the states mean */}
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {([
          ['open', Bell, 'Needs attention', 'Nobody has looked at it yet.', counts.open,
           'text-rose-600', 'bg-rose-50'],
          ['acknowledged', Clock, 'Action planned', 'Someone has seen it and said what they will do.',
           counts.acknowledged, 'text-amber-600', 'bg-amber-50'],
          ['reviewed', CircleCheck, 'Patient reviewed', 'The patient was seen and the outcome recorded.',
           counts.reviewed, 'text-emerald-600', 'bg-emerald-50'],
        ] as const).map(([key, Icon, title, blurb, n, tone, bg]) => (
          <button
            key={key} onClick={() => setTab(key as any)}
            className={`${card} p-4 text-left transition
              ${tab === key ? 'ring-2 ring-tsoka-mid' : 'hover:border-tsoka-mid'}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-lg grid place-items-center ${bg}`}>
                <Icon size={16} className={tone} />
              </span>
              <span className={`text-2xl font-bold ${tone}`}>{n}</span>
            </div>
            <p className="font-semibold text-slate-900 text-sm mt-2.5">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{blurb}</p>
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </p>
      )}

      {!loading && shown.length === 0 && (
        <div className={`${card} px-6 py-14 text-center`}>
          <CircleCheck size={26} className="mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">
            {tab === 'open' ? 'Nothing needs attention' : 'Nothing here'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {tab === 'open'
              ? 'Every flagged patient has been picked up.'
              : 'Alerts appear here once they reach this stage.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {shown.map((a) => {
          const risk = risks[a.patient_id]
          const s = risk ? RISK_STYLES[risk] : null
          const days = waitingDays(a.created_at)
          return (
            <div key={a.id} className={`${card} p-5`}>
              <div className="flex items-start gap-3">
                <span className={`w-10 h-10 rounded-full grid place-items-center shrink-0
                                  text-xs font-bold ${avatarTint(a.patient_id)}`}>
                  {initials(names[a.patient_id] ?? '?')}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onOpenPatient(a.patient_id)}
                      className="font-semibold text-slate-900 hover:text-tsoka-teal
                                 flex items-center gap-1"
                    >
                      {names[a.patient_id] ?? 'Patient'}
                      <ChevronRight size={15} className="text-slate-300" />
                    </button>
                    {s && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold
                                        ring-1 ${s.bg} ${s.text} ${s.ring}`}>
                        {s.label}
                      </span>
                    )}
                    {a.status === 'open' && days >= 3 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold
                                       bg-rose-100 text-rose-700">
                        waiting {days} days
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                    {a.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Raised {formatDate(a.created_at)}
                  </p>

                  {a.action_taken && (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                      <p className="text-xs font-semibold text-slate-500">Action planned</p>
                      <p className="text-sm text-slate-700 mt-0.5">{a.action_taken}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {staff[a.acknowledged_by ?? ''] ?? 'Staff'} ·{' '}
                        {formatDate(a.acknowledged_at)}
                      </p>
                    </div>
                  )}

                  {a.resolution_note && (
                    <div className="mt-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200
                                    px-3.5 py-2.5">
                      <p className="text-xs font-semibold text-emerald-700">Outcome</p>
                      <p className="text-sm text-emerald-900 mt-0.5">{a.resolution_note}</p>
                      <p className="text-[11px] text-emerald-600/70 mt-1">
                        {formatDate(a.resolved_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* open: acknowledge with an action */}
              {a.status === 'open' && (
                <div className="mt-4 pl-13">
                  {openForm === a.id ? (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800 mb-2.5">
                        What will you do about it?
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {ACTIONS.map((t) => (
                          <button
                            key={t} onClick={() => setAction(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition
                              ${action === t
                                ? 'bg-tsoka-deep text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-tsoka-mid'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <input
                        value={action} onChange={(e) => setAction(e.target.value)}
                        placeholder="Or type something else"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200
                                   text-sm bg-white outline-none
                                   focus:ring-2 focus:ring-tsoka-mid/40 transition"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => acknowledge(a.id)} disabled={busy}
                          className="px-4 py-2 rounded-xl bg-tsoka-deep text-white text-sm
                                     font-semibold hover:bg-tsoka-teal disabled:opacity-50
                                     transition"
                        >
                          {busy ? 'Saving…' : 'Acknowledge'}
                        </button>
                        <button
                          onClick={() => { setOpenForm(null); setAction('') }}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-sm
                                     text-slate-600 hover:bg-white transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setOpenForm(a.id); setAction('') }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                                 border border-slate-200 text-sm font-semibold
                                 text-tsoka-teal hover:bg-slate-50 transition"
                    >
                      <Check size={15} /> Acknowledge
                    </button>
                  )}
                </div>
              )}

              {/* acknowledged: record the outcome */}
              {a.status === 'acknowledged' && (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <input
                    value={outcome[a.id] ?? ''}
                    onChange={(e) => setOutcome({ ...outcome, [a.id]: e.target.value })}
                    placeholder="What happened when they were seen?"
                    className="flex-1 min-w-[220px] px-3.5 py-2.5 rounded-xl border
                               border-slate-200 text-sm outline-none
                               focus:ring-2 focus:ring-tsoka-mid/40 transition"
                    onKeyDown={(e) => e.key === 'Enter' && resolve(a.id)}
                  />
                  <button
                    onClick={() => resolve(a.id)} disabled={busy}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl
                               bg-emerald-600 text-white text-sm font-semibold
                               hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    <Stethoscope size={15} /> Mark reviewed
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
