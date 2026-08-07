import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/types'
import {
  CalendarDays, MapPin, Check, Plus, Clock, X, CircleCheck, Loader2, Trash2,
} from 'lucide-react'

type Appt = {
  id: string
  scheduled_for: string
  scheduled_at: string | null
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled'
  reason: string | null
  staff_note: string | null
}

const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm'

const STATUS: Record<string, { label: string; cls: string; Icon: any }> = {
  requested: { label: 'Waiting for the clinic', cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Clock },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: CircleCheck },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600 ring-slate-200', Icon: Check },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: X },
}

const REASONS = [
  'Routine diabetes check',
  'Foot screening',
  'My foot is sore or looks different',
  'Medication review',
  'Something else',
]

export default function AppointmentsPatient({
  patientId, clinicId, clinicName,
}: { patientId: string; clinicId: string | null; clinicName: string | null }) {
  const [rows, setRows] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState(REASONS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('appointments').select('*')
      .eq('patient_id', patientId)
      .order('scheduled_for', { ascending: false })
    setRows((data ?? []) as Appt[])
    setLoading(false)
  }

  useEffect(() => { load() }, [patientId])

  async function request() {
    if (!date) { setError('Choose a date that suits you.'); return }
    setBusy(true); setError('')
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('appointments').insert({
      patient_id: patientId,
      clinic_id: clinicId,
      scheduled_for: date,
      reason,
      status: 'requested',
      requested_by: u.user?.id ?? null,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setDate(''); setOpen(false); load()
  }

  async function cancel(id: string) {
    setBusy(true)
    await supabase.from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
    setBusy(false); load()
  }

  const upcoming = rows.filter(
    (r) => ['requested', 'confirmed'].includes(r.status)
      && r.scheduled_for >= new Date().toISOString().slice(0, 10),
  )
  const past = rows.filter((r) => !upcoming.includes(r))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Your upcoming visits, and requests you have made.
          </p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tsoka-deep
                     text-white text-sm font-semibold hover:bg-tsoka-teal transition"
        >
          {open ? <X size={16} /> : <Plus size={16} />}
          {open ? 'Cancel' : 'Request appointment'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3
                        text-sm text-rose-700">{error}</div>
      )}

      {open && (
        <div className={`${card} p-5 mb-4`}>
          <p className="font-semibold text-slate-900 mb-1">Request an appointment</p>
          <p className="text-sm text-slate-500 mb-4">
            Choose a date that suits you. The clinic will confirm a time, or suggest
            another day if that one is full.
          </p>

          <label className="block mb-3">
            <span className="block text-xs font-medium text-slate-500 mb-1.5">
              Preferred date
            </span>
            <input
              type="date" value={date} min={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                         outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
            />
          </label>

          <span className="block text-xs font-medium text-slate-500 mb-1.5">
            What is it for?
          </span>
          <div className="space-y-1.5 mb-4">
            {REASONS.map((r) => (
              <label key={r}
                     className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border
                                 cursor-pointer transition
                       ${reason === r ? 'border-tsoka-teal bg-tsoka-mid/5'
                                      : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="reason" checked={reason === r}
                       onChange={() => setReason(r)}
                       className="w-4 h-4 accent-tsoka-teal" />
                <span className="text-sm text-slate-800">{r}</span>
              </label>
            ))}
          </div>

          <button
            onClick={request} disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-tsoka-warm text-white text-sm
                       font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </div>
      )}

      {loading && (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </p>
      )}

      {!loading && upcoming.length === 0 && !open && (
        <div className={`${card} px-6 py-12 text-center mb-4`}>
          <CalendarDays size={24} className="mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No appointment booked</p>
          <p className="text-sm text-slate-500 mt-1">
            Request one above and your clinic will confirm it.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {upcoming.map((a) => {
          const st = STATUS[a.status]
          return (
            <div key={a.id} className={`${card} p-5`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-tsoka-mid/10 grid place-items-center
                                shrink-0">
                  <CalendarDays size={22} className="text-tsoka-teal" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-slate-900 leading-tight">
                    {formatDate(a.scheduled_for)}
                  </p>
                  {a.scheduled_at && (
                    <p className="text-sm text-slate-600 mt-0.5">
                      {a.scheduled_at.slice(0, 5)}
                    </p>
                  )}
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin size={13} /> {clinicName ?? 'Your clinic'}
                  </p>
                  {a.reason && (
                    <p className="text-sm text-slate-600 mt-1.5">{a.reason}</p>
                  )}
                  {a.staff_note && (
                    <p className="text-sm text-slate-700 mt-2 rounded-lg bg-slate-50
                                  px-3 py-2">
                      {a.staff_note}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px]
                                  font-semibold ring-1 ${st.cls}`}>
                  {st.label}
                </span>
              </div>

              <button
                onClick={() => cancel(a.id)} disabled={busy}
                className="mt-4 flex items-center gap-1.5 text-xs font-medium
                           text-slate-500 hover:text-rose-600 transition"
              >
                <Trash2 size={13} /> Cancel this appointment
              </button>
            </div>
          )
        })}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="font-semibold text-slate-900 mt-8 mb-3">Past appointments</h2>
          <div className={`${card} divide-y divide-slate-100`}>
            {past.slice(0, 8).map((a) => {
              const st = STATUS[a.status]
              return (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(a.scheduled_for)}
                    </p>
                    <p className="text-xs text-slate-500">{a.reason}</p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px]
                                    font-semibold ring-1 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <section className={`${card} p-5 mt-6`}>
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
  )
}
