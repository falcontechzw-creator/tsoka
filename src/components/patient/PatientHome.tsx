import { useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import FootMap from '../FootMap'
import type { PatientNav } from './PatientShell'
import type { usePatientData } from './usePatientData'
import { formatDate } from '../../lib/types'
import {
  ShieldCheck, TriangleAlert, AlertCircle, CalendarDays, Droplet, Pill,
  Check, Lightbulb, MessageSquare, ArrowRight, Heart, Scale, Bell,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea,
} from 'recharts'

type Data = ReturnType<typeof usePatientData>
type Props = { d: Data; go: (k: PatientNav) => void }

const CARE_TIPS = [
  'Check your feet daily for cuts, blisters, redness or swelling.',
  'Wash your feet in warm water and dry carefully between the toes.',
  'Wear shoes that fit well, and never walk barefoot outdoors.',
  'Contact your clinic if you notice redness, warmth or a sore that will not heal.',
  'Keep your blood sugar in range, it protects the nerves and blood flow in your feet.',
]

const FRIENDLY = {
  green: {
    title: 'Low risk',
    Icon: ShieldCheck,
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'text-emerald-600',
    message: 'Your latest scan shows no signs of concern. Keep doing what you are doing.',
  },
  amber: {
    title: 'Needs watching',
    Icon: AlertCircle,
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'text-amber-600',
    message: 'One spot on your foot is a little warm. Keep checking it and mention it at your next visit.',
  },
  red: {
    title: 'See a nurse',
    Icon: TriangleAlert,
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'text-rose-600',
    message: 'Your latest scan found a warm spot that should be looked at this week. Please contact your clinic.',
  },
} as const

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function glucoseInRange(v: number | null) {
  return v != null && v >= 4 && v <= 7.8
}

const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm'

export default function PatientHome({ d, go }: Props) {
  const {
    patient, clinicName, risks, readings, asymmetry, lastScanAt,
    latestVital, meds, takenToday, messages, alerts, latestRisk, reload,
  } = d

  const first = patient?.full_name?.split(' ')[0] ?? ''
  const tip = useMemo(
    () => CARE_TIPS[new Date().getDate() % CARE_TIPS.length],
    [],
  )

  const trend = risks.slice(-6).map((r) => ({
    date: new Date(r.computed_at).toLocaleDateString(undefined, {
      month: 'short', year: '2-digit',
    }),
    value: r.risk === 'red' ? 3 : r.risk === 'amber' ? 2 : 1,
    asym: Number(r.max_asymmetry_c),
  }))

  const f = latestRisk ? FRIENDLY[latestRisk.risk] : null
  const nextMed = meds.find((m) => !takenToday.has(m.id))
  const clinicMsg = messages.find((m) => m.from_clinic)

  async function markTaken(id: string) {
    if (!patient) return
    await supabase.from('medication_logs').insert({
      medication_id: id, patient_id: patient.id,
    })
    reload()
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
        {greeting()}{first && `, ${first}`} <span aria-hidden>👋</span>
      </h1>
      <p className="text-slate-500 mt-1 mb-7">Here is your health overview for today.</p>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* ---------- foot health ---------- */}
        <section className={`${card} p-6 lg:col-span-2`}>
          <h2 className="font-semibold text-slate-900 mb-4">Your foot health</h2>
          <div className="grid sm:grid-cols-2 gap-6 items-center">
            <div>
              {f && latestRisk ? (
                <>
                  <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                                    text-sm font-bold ring-1 ${f.chip}`}>
                    <f.Icon size={15} /> {f.title}
                  </span>
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">{f.message}</p>
                  <p className="text-xs text-slate-400 mt-4">Last scan</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(lastScanAt)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  You have not been screened yet. Visit your clinic and stand on the
                  Tsoka mat to get your first result.
                </p>
              )}
              <button
                onClick={() => go('foot')}
                className="mt-5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                           font-semibold text-tsoka-teal hover:bg-slate-50 transition"
              >
                View foot health
              </button>
            </div>

            <div className="flex justify-center">
              {readings.length > 0 ? (
                <div className="w-full max-w-[260px] scale-90 origin-center">
                  <FootMap readings={readings} asymmetry={asymmetry} />
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center">
                  Your foot map appears here after your first scan.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ---------- right column ---------- */}
        <div className="space-y-4">
          <section className={`${card} p-5`}>
            <h2 className="font-semibold text-slate-900 mb-4">Next appointment</h2>
            {patient?.next_appointment ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 grid place-items-center
                                  shrink-0">
                    <CalendarDays size={20} className="text-tsoka-teal" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 leading-tight">
                      {formatDate(patient.next_appointment)}
                    </p>
                    {patient.next_appointment_time && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {patient.next_appointment_time.slice(0, 5)}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {clinicName ?? 'Your clinic'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => go('appointments')}
                  className="w-full mt-4 py-2.5 rounded-xl border border-slate-200 text-sm
                             font-semibold text-tsoka-teal hover:bg-slate-50 transition"
                >
                  View appointment
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                No appointment scheduled. Contact your clinic to book one.
              </p>
            )}
          </section>

          <section className={`${card} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={16} className="text-tsoka-teal" />
              <h2 className="font-semibold text-slate-900">Recent alerts</h2>
            </div>
            {alerts.length === 0 ? (
              <>
                <p className="text-sm font-medium text-slate-800">No new alerts</p>
                <p className="text-sm text-slate-500 mt-0.5">You are doing great.</p>
              </>
            ) : (
              <ul className="space-y-2.5">
                {alerts.slice(0, 2).map((a) => (
                  <li key={a.id} className="border-l-2 border-rose-400 pl-3">
                    <p className="text-sm text-slate-700 leading-snug">
                      A warm spot was found on your foot. Please contact your clinic.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDate(a.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => go('foot')}
              className="mt-4 text-sm font-semibold text-tsoka-teal hover:underline"
            >
              View alert history
            </button>
          </section>
        </div>

        {/* ---------- glucose ---------- */}
        <section className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <Droplet size={16} className="text-sky-500" />
            <h2 className="font-semibold text-slate-900">Today's glucose</h2>
          </div>
          {latestVital?.glucose_mmol != null ? (
            <>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-bold text-slate-900 leading-none">
                  {latestVital.glucose_mmol}
                </p>
                <p className="text-sm text-slate-500 mb-1">mmol/L</p>
                <span className={`ml-auto mb-1 px-2.5 py-1 rounded-full text-xs font-semibold
                  ring-1 ${glucoseInRange(latestVital.glucose_mmol)
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                  {glucoseInRange(latestVital.glucose_mmol) ? 'In range' : 'Out of range'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Recorded {new Date(latestVital.recorded_at).toLocaleString(undefined, {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No glucose recorded yet. Add one from My readings.
            </p>
          )}
        </section>

        {/* ---------- medication ---------- */}
        <section className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <Pill size={16} className="text-rose-500" />
            <h2 className="font-semibold text-slate-900">Medication reminder</h2>
          </div>
          {nextMed ? (
            <>
              <p className="font-semibold text-slate-900">
                {nextMed.name}{nextMed.dosage && ` ${nextMed.dosage}`}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                {nextMed.instructions ?? 'As prescribed'}
                {nextMed.time_of_day && ` · ${nextMed.time_of_day}`}
              </p>
              <button
                onClick={() => markTaken(nextMed.id)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5
                           rounded-xl border border-slate-200 text-sm font-semibold
                           text-tsoka-teal hover:bg-slate-50 transition"
              >
                <Check size={15} /> Mark as taken
              </button>
            </>
          ) : meds.length > 0 ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <Check size={17} />
              <p className="text-sm font-medium">All medication taken today.</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No medication recorded. Your clinic can add it for you.
            </p>
          )}
        </section>

        {/* ---------- risk trend ---------- */}
        <section className={`${card} p-5 lg:row-span-2`}>
          <h2 className="font-semibold text-slate-900">Risk trend</h2>
          <p className="text-xs text-slate-500 mb-4">Your risk level over time</p>
          {trend.length < 2 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Your trend appears after two or more scans.
            </p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <ReferenceArea y1={2.5} y2={3.5} fill="#FEE2E2" fillOpacity={0.5} />
                    <ReferenceArea y1={1.5} y2={2.5} fill="#FEF3C7" fillOpacity={0.5} />
                    <ReferenceArea y1={0.5} y2={1.5} fill="#D1FAE5" fillOpacity={0.5} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F2" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B3' }}
                           axisLine={false} tickLine={false} />
                    <YAxis domain={[0.5, 3.5]} ticks={[1, 2, 3]}
                           tickFormatter={(v) => ({ 1: 'Low', 2: 'Moderate', 3: 'High' } as any)[v]}
                           tick={{ fontSize: 10, fill: '#94A3B3' }}
                           axisLine={false} tickLine={false} width={64} />
                    <Tooltip
                      formatter={(v: any) => [
                        ({ 1: 'Low risk', 2: 'Moderate risk', 3: 'High risk' } as any)[v], 'Result',
                      ]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#0E7C86" strokeWidth={2.5}
                          dot={{ r: 4, fill: '#0E7C86', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                {[['#E11D48', 'High risk'], ['#F59E0B', 'Moderate risk'],
                  ['#10B981', 'Low risk']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} /> {l}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ---------- care tip ---------- */}
        <section className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-amber-500" />
            <h2 className="font-semibold text-slate-900">Daily care tip</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
          <button
            onClick={() => go('help')}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold
                       text-tsoka-teal hover:underline"
          >
            See more tips <ArrowRight size={14} />
          </button>
        </section>

        {/* ---------- clinic messages ---------- */}
        <section className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-tsoka-teal" />
            <h2 className="font-semibold text-slate-900">Clinic messages</h2>
          </div>
          {clinicMsg ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {clinicMsg.sender_name ?? 'Your clinic'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatDate(clinicMsg.created_at)}
                </p>
              </div>
              <p className="text-sm text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                {clinicMsg.body}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No messages from your clinic yet.</p>
          )}
          <button
            onClick={() => go('messages')}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold
                       text-tsoka-teal hover:underline"
          >
            View all messages <ArrowRight size={14} />
          </button>
        </section>

        {/* ---------- readings summary ---------- */}
        <section className={`${card} p-5 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Your readings</h2>
            <button
              onClick={() => go('readings')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold
                         text-tsoka-teal hover:underline"
            >
              View all readings <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {([
              [Droplet, 'text-sky-500', 'Glucose',
               latestVital?.glucose_mmol != null ? `${latestVital.glucose_mmol}` : '—', 'mmol/L'],
              [Heart, 'text-rose-500', 'Blood pressure',
               latestVital?.systolic && latestVital?.diastolic
                 ? `${latestVital.systolic}/${latestVital.diastolic}` : '—', 'mmHg'],
              [Scale, 'text-teal-600', 'Weight',
               latestVital?.weight_kg != null ? `${latestVital.weight_kg}` : '—', 'kg'],
            ] as const).map(([Icon, tone, label, value, unit]) => (
              <div key={label} className="sm:border-r last:border-r-0 border-slate-100 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={15} className={tone} />
                  <p className="text-sm text-slate-600">{label}</p>
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-none">
                  {value} <span className="text-sm font-normal text-slate-500">{unit}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {latestVital
                    ? new Date(latestVital.recorded_at).toLocaleString(undefined, {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Not recorded'}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
