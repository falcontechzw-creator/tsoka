import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import FootMap from '../FootMap'
import type { usePatientData } from './usePatientData'
import { formatDate, initials, avatarTint } from '../../lib/types'
import {
  Check, Send, CalendarDays, MapPin, Phone,
  ShieldCheck, Lightbulb, TriangleAlert, Pill, Plus,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

type Data = ReturnType<typeof usePatientData>
const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm'

const H = ({ t, s }: { t: string; s?: string }) => (
  <div className="mb-6">
    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t}</h1>
    {s && <p className="text-slate-500 text-sm mt-0.5">{s}</p>}
  </div>
)

/* ------------------------------- foot health ------------------------------- */
export function FootHealth({ d }: { d: Data }) {
  const { readings, asymmetry, lastScanAt, risks, alerts } = d
  const latest = risks.length ? risks[risks.length - 1] : null

  return (
    <div>
      <H t="My foot health" s="Your most recent screening result." />
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <section className={`${card} p-6 lg:col-span-2`}>
          {readings.length ? (
            <>
              <p className="text-sm text-slate-500 mb-1">
                Scanned {formatDate(lastScanAt)}
              </p>
              {latest && (
                <p className="text-sm text-slate-700 mb-5">
                  Largest difference between your two feet:{' '}
                  <span className="font-semibold">
                    {Number(latest.max_asymmetry_c).toFixed(1)} °C
                  </span>
                </p>
              )}
              <FootMap readings={readings} asymmetry={asymmetry} />
            </>
          ) : (
            <p className="text-sm text-slate-500 py-10 text-center">
              No scan recorded yet. Visit your clinic to be screened.
            </p>
          )}
        </section>

        <div className="space-y-4">
          <section className={`${card} p-5`}>
            <h2 className="font-semibold text-slate-900 mb-3">What this means</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              The mat compares the same spots on both of your feet. A spot that stays
              warmer than its match can be an early sign that the skin underneath is
              under stress, often before anything can be seen or felt.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              This is a warning, not a diagnosis. Your nurse decides what it means.
            </p>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="font-semibold text-slate-900 mb-3">Alert history</h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500">No alerts on your record.</p>
            ) : (
              <ul className="space-y-3">
                {alerts.map((a) => (
                  <li key={a.id} className="flex gap-2.5">
                    <TriangleAlert size={15} className="text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-700 leading-snug">
                        A warm spot was found. Clinical review was recommended.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(a.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- readings -------------------------------- */
export function Readings({ d }: { d: Data }) {
  const { patient, vitals, reload } = d
  const [open, setOpen] = useState(false)
  const [g, setG] = useState(''); const [s, setS] = useState('')
  const [dia, setDia] = useState(''); const [w, setW] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const chart = [...vitals].reverse()
    .filter((v) => v.glucose_mmol != null)
    .slice(-14)
    .map((v) => ({
      date: new Date(v.recorded_at).toLocaleDateString(undefined,
        { day: 'numeric', month: 'short' }),
      glucose: Number(v.glucose_mmol),
    }))

  async function save() {
    if (!patient) return
    if (!g && !s && !w) { setErr('Enter at least one reading.'); return }
    setSaving(true); setErr('')
    const { error } = await supabase.from('vitals').insert({
      patient_id: patient.id,
      glucose_mmol: g ? Number(g) : null,
      systolic: s ? Number(s) : null,
      diastolic: dia ? Number(dia) : null,
      weight_kg: w ? Number(w) : null,
      source: 'app',
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setG(''); setS(''); setDia(''); setW(''); setOpen(false); reload()
  }

  const input = `w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                 outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition`

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My readings</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Glucose, blood pressure and weight over time.
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tsoka-deep
                     text-white text-sm font-semibold hover:bg-tsoka-teal transition"
        >
          <Plus size={16} /> {open ? 'Cancel' : 'Add reading'}
        </button>
      </div>

      {open && (
        <div className={`${card} p-5 mb-4`}>
          <div className="grid sm:grid-cols-4 gap-3">
            {([['Glucose mmol/L', g, setG], ['Systolic', s, setS],
               ['Diastolic', dia, setDia], ['Weight kg', w, setW]] as const).map(
              ([label, val, set]) => (
                <label key={label} className="text-sm">
                  <span className="block text-xs font-medium text-slate-500 mb-1.5">
                    {label}
                  </span>
                  <input type="number" step="0.1" inputMode="decimal" value={val}
                         onChange={(e) => set(e.target.value)} className={input} />
                </label>
              ),
            )}
          </div>
          {err && <p className="text-sm text-rose-600 mt-3">{err}</p>}
          <button onClick={save} disabled={saving}
                  className="mt-4 px-4 py-2.5 rounded-xl bg-tsoka-warm text-white text-sm
                             font-semibold hover:opacity-90 disabled:opacity-50 transition">
            {saving ? 'Saving…' : 'Save reading'}
          </button>
        </div>
      )}

      {chart.length > 1 && (
        <section className={`${card} p-5 mb-4`}>
          <h2 className="font-semibold text-slate-900 mb-4">Glucose trend</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F2" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B3' }}
                       axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B3' }}
                       axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0',
                                         fontSize: 12 }} />
                <Area type="monotone" dataKey="glucose" stroke="#0EA5E9" strokeWidth={2.5}
                      fill="url(#gFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className={`${card} overflow-hidden`}>
        {vitals.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-500 text-center">
            No readings yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Date</th>
                <th className="text-center px-3 py-3 font-semibold">Glucose</th>
                <th className="text-center px-3 py-3 font-semibold">BP</th>
                <th className="text-center px-3 py-3 font-semibold">Weight</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-slate-600">
                    {new Date(v.recorded_at).toLocaleDateString()}
                  </td>
                  <td className="text-center px-3 py-3 text-slate-900 font-medium">
                    {v.glucose_mmol ?? '—'}
                  </td>
                  <td className="text-center px-3 py-3 text-slate-900 font-medium">
                    {v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : '—'}
                  </td>
                  <td className="text-center px-3 py-3 text-slate-900 font-medium">
                    {v.weight_kg ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

/* ------------------------------ appointments ------------------------------ */
export function Appointments({ d }: { d: Data }) {
  const { patient, clinicName } = d
  return (
    <div>
      <H t="Appointments" s="Your upcoming clinic visit." />
      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <section className={`${card} p-6`}>
          {patient?.next_appointment ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-tsoka-mid/10 grid place-items-center mb-4">
                <CalendarDays size={22} className="text-tsoka-teal" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {formatDate(patient.next_appointment)}
              </p>
              {patient.next_appointment_time && (
                <p className="text-slate-600 mt-1">
                  {patient.next_appointment_time.slice(0, 5)}
                </p>
              )}
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-3">
                <MapPin size={14} /> {clinicName ?? 'Your clinic'}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No appointment scheduled. Contact your clinic to book one.
            </p>
          )}
        </section>

        <section className={`${card} p-6`}>
          <h2 className="font-semibold text-slate-900 mb-3">Before you come in</h2>
          <ul className="space-y-2.5 text-sm text-slate-600">
            {['Bring your medication with you.',
              'Wear shoes that are easy to remove for the foot scan.',
              'Note down anything you have felt in your feet since your last visit.'].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check size={15} className="text-tsoka-teal shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/* ------------------------------- medication ------------------------------- */
export function Medication({ d }: { d: Data }) {
  const { patient, meds, takenToday, reload } = d

  async function toggle(id: string, taken: boolean) {
    if (!patient) return
    if (taken) {
      await supabase.from('medication_logs').delete()
        .eq('medication_id', id).eq('taken_on', new Date().toISOString().slice(0, 10))
    } else {
      await supabase.from('medication_logs').insert({
        medication_id: id, patient_id: patient.id,
      })
    }
    reload()
  }

  return (
    <div>
      <H t="Medication" s="Tick each one off as you take it today." />
      {meds.length === 0 ? (
        <div className={`${card} px-6 py-14 text-center`}>
          <Pill size={26} className="mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No medication recorded</p>
          <p className="text-sm text-slate-500 mt-1">
            Your clinic can add your prescriptions here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {meds.map((m) => {
            const taken = takenToday.has(m.id)
            return (
              <div key={m.id} className={`${card} p-5 flex items-center gap-4`}>
                <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0
                  ${taken ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                  <Pill size={19} className={taken ? 'text-emerald-600' : 'text-slate-400'} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {m.name}{m.dosage && ` ${m.dosage}`}
                  </p>
                  <p className="text-sm text-slate-500">
                    {m.instructions ?? 'As prescribed'}
                    {m.time_of_day && ` · ${m.time_of_day}`}
                  </p>
                </div>
                <button
                  onClick={() => toggle(m.id, taken)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                              text-sm font-semibold transition
                    ${taken
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'border border-slate-200 text-tsoka-teal hover:bg-slate-50'}`}
                >
                  <Check size={15} /> {taken ? 'Taken' : 'Mark as taken'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* -------------------------------- messages -------------------------------- */
export function Messages({ d }: { d: Data }) {
  const { patient, messages, reload } = d
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    const text = body.trim()
    if (!text || !patient) return
    setSending(true)
    const { data: u } = await supabase.auth.getUser()
    await supabase.from('messages').insert({
      patient_id: patient.id,
      sender_id: u.user?.id ?? null,
      sender_name: patient.full_name,
      from_clinic: false,
      body: text,
    })
    setBody(''); setSending(false); reload()
  }

  const ordered = [...messages].reverse()

  return (
    <div>
      <H t="Messages" s="Secure messages between you and your clinic." />
      <section className={`${card} p-5`}>
        {ordered.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No messages yet. Send one below and your clinic will reply.
          </p>
        ) : (
          <ul className="space-y-4 mb-5 max-h-[460px] overflow-y-auto">
            {ordered.map((m) => {
              const who = m.sender_name ?? (m.from_clinic ? 'Your clinic' : 'You')
              return (
                <li key={m.id}
                    className={`flex gap-3 ${m.from_clinic ? '' : 'flex-row-reverse'}`}>
                  <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0
                                    text-[11px] font-bold ${avatarTint(who)}`}>
                    {initials(who)}
                  </span>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5
                    ${m.from_clinic
                      ? 'bg-slate-100 text-slate-800'
                      : 'bg-tsoka-teal text-white'}`}>
                    <p className={`text-[11px] font-semibold mb-0.5
                      ${m.from_clinic ? 'text-slate-500' : 'text-white/70'}`}>
                      {who}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`text-[10px] mt-1
                      ${m.from_clinic ? 'text-slate-400' : 'text-white/50'}`}>
                      {new Date(m.created_at).toLocaleString(undefined, {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex gap-2 items-end border-t border-slate-100 pt-4">
          <textarea
            rows={2} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message to your clinic…"
            aria-label="Message to your clinic"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                       resize-none outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
          />
          <button
            onClick={send} disabled={sending || !body.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-tsoka-deep
                       text-white text-sm font-semibold hover:bg-tsoka-teal
                       disabled:opacity-40 transition"
          >
            <Send size={15} /> Send
          </button>
        </div>
      </section>
    </div>
  )
}

/* ---------------------------------- help ---------------------------------- */
export function Help() {
  const tips = [
    ['Check your feet every day',
     'Look for cuts, blisters, redness, swelling or nails that need trimming. Use a mirror to see the soles, or ask someone to help.'],
    ['Keep your feet clean and dry',
     'Wash in warm, not hot, water. Dry carefully, especially between the toes, where damp skin breaks down easily.'],
    ['Wear protective footwear',
     'Never walk barefoot, indoors or outdoors. Check inside your shoes for stones or rough seams before putting them on.'],
    ['Do not treat problems yourself',
     'Avoid cutting corns or calluses, and do not use strong chemical removers. Let a health worker deal with them.'],
    ['Act early on redness or warmth',
     'A warm or red patch is an early warning. Contact your clinic rather than waiting to see if it settles.'],
  ]

  return (
    <div>
      <H t="Help and support" s="Looking after your feet, day to day." />
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-3">
          {tips.map(([t, b]) => (
            <section key={t} className={`${card} p-5 flex gap-4`}>
              <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center shrink-0">
                <Lightbulb size={18} className="text-amber-500" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{t}</h2>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{b}</p>
              </div>
            </section>
          ))}
        </div>

        <section className={`${card} p-6`}>
          <ShieldCheck size={22} className="text-tsoka-teal mb-3" />
          <h2 className="font-semibold text-slate-900">When to contact your clinic</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {['A sore that is not healing', 'Redness, warmth or swelling',
              'Any break in the skin', 'New numbness or tingling',
              'Tsoka shows a warm spot'].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tsoka-warm mt-2 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/* --------------------------------- profile -------------------------------- */
export function Profile({ d, email }: { d: Data; email: string }) {
  const { patient, clinicName } = d
  const rows: [string, string][] = [
    ['Full name', patient?.full_name ?? '—'],
    ['Email', email],
    ['Phone', patient?.phone ?? '—'],
    ['Diabetes type', patient?.diabetes_type ?? '—'],
    ['Clinic', clinicName ?? '—'],
    ['Allergies', patient?.allergies ?? 'None recorded'],
  ]

  return (
    <div>
      <H t="Profile" s="Your details as held by your clinic." />
      <section className={`${card} p-6 max-w-2xl`}>
        <div className="flex items-center gap-4 mb-6">
          <span className="w-14 h-14 rounded-full bg-tsoka-mid/15 text-tsoka-teal
                           grid place-items-center text-lg font-bold">
            {initials(patient?.full_name ?? 'P')}
          </span>
          <div>
            <p className="text-lg font-bold text-slate-900">
              {patient?.full_name ?? 'Patient'}
            </p>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Phone size={13} /> {patient?.phone ?? 'No phone on file'}
            </p>
          </div>
        </div>

        <dl className="divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="text-sm text-slate-500">{k}</dt>
              <dd className="text-sm font-medium text-slate-900 text-right capitalize">
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <p className="text-xs text-slate-400 mt-5 leading-relaxed">
          To correct any of these details, send a message to your clinic.
        </p>
      </section>
    </div>
  )
}
