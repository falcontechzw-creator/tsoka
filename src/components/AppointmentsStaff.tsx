import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { initials, avatarTint, formatDate } from '../lib/types'
import {
  CalendarDays, Check, X, Clock, CircleCheck, Loader2, Plus,
  ChevronRight, Inbox,
} from 'lucide-react'

type Appt = {
  id: string
  patient_id: string
  scheduled_for: string
  scheduled_at: string | null
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled'
  reason: string | null
  staff_note: string | null
  created_at: string
}

type Props = { onOpenPatient: (id: string) => void }

const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm'

const STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: 'Requested', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

export default function AppointmentsStaff({ onOpenPatient }: Props) {
  const [rows, setRows] = useState<Appt[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [patients, setPatients] = useState<{ id: string; full_name: string; clinic_id: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'requested' | 'confirmed' | 'past'>('requested')

  // confirming a request
  const [editing, setEditing] = useState<string | null>(null)
  const [time, setTime] = useState('')
  const [newDate, setNewDate] = useState('')
  const [note, setNote] = useState('')

  // booking on behalf of a patient
  const [booking, setBooking] = useState(false)
  const [bPatient, setBPatient] = useState('')
  const [bDate, setBDate] = useState('')
  const [bTime, setBTime] = useState('')
  const [bReason, setBReason] = useState('Routine diabetes check')

  async function load() {
    setLoading(true)
    const [a, p] = await Promise.all([
      supabase.from('appointments').select('*')
        .order('scheduled_for', { ascending: true }),
      supabase.from('patients').select('id, full_name, clinic_id').order('full_name'),
    ])
    if (a.error) setError(a.error.message)
    setRows((a.data ?? []) as Appt[])
    const pl = (p.data ?? []) as any[]
    setPatients(pl)
    setNames(Object.fromEntries(pl.map((x) => [x.id, x.full_name])))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function confirm(a: Appt) {
    setBusy(true); setError('')
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('appointments').update({
      status: 'confirmed',
      scheduled_for: newDate || a.scheduled_for,
      scheduled_at: time || a.scheduled_at,
      staff_note: note.trim() || null,
      confirmed_by: u.user?.id ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', a.id)
    setBusy(false)
    if (error) { setError(error.message); return }
    setEditing(null); setTime(''); setNewDate(''); setNote(''); load()
  }

  async function setStatus(id: string, status: string) {
    setBusy(true)
    await supabase.from('appointments')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(false); load()
  }

  async function book() {
    if (!bPatient || !bDate) { setError('Choose a patient and a date.'); return }
    setBusy(true); setError('')
    const clinic = patients.find((p) => p.id === bPatient)?.clinic_id ?? null
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('appointments').insert({
      patient_id: bPatient, clinic_id: clinic,
      scheduled_for: bDate, scheduled_at: bTime || null,
      reason: bReason, status: 'confirmed',
      requested_by: u.user?.id ?? null, confirmed_by: u.user?.id ?? null,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setBPatient(''); setBDate(''); setBTime(''); setBooking(false); load()
  }

  const today = new Date().toISOString().slice(0, 10)
  const requested = rows.filter((r) => r.status === 'requested')
  const confirmed = rows.filter((r) => r.status === 'confirmed' && r.scheduled_for >= today)
  const past = rows.filter(
    (r) => r.status === 'completed' || r.status === 'cancelled'
        || (r.status === 'confirmed' && r.scheduled_for < today),
  )

  const shown = tab === 'requested' ? requested : tab === 'confirmed' ? confirmed : past

  const counts = useMemo(() => ({
    requested: requested.length, confirmed: confirmed.length, past: past.length,
  }), [rows])

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Requests from patients, and visits you have booked.
          </p>
        </div>
        <button
          onClick={() => setBooking(!booking)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tsoka-deep
                     text-white text-sm font-semibold hover:bg-tsoka-teal transition"
        >
          {booking ? <X size={16} /> : <Plus size={16} />}
          {booking ? 'Cancel' : 'Book appointment'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3
                        text-sm text-rose-700">{error}</div>
      )}

      {booking && (
        <div className={`${card} p-5 mb-4`}>
          <p className="font-semibold text-slate-900 mb-4">Book for a patient</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <select
              value={bPatient} onChange={(e) => setBPatient(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm
                         outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
            >
              <option value="">Choose a patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
            <input
              value={bReason} onChange={(e) => setBReason(e.target.value)}
              placeholder="Reason"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                         outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
            />
            <input
              type="date" value={bDate} min={today}
              onChange={(e) => setBDate(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                         outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
            />
            <input
              type="time" value={bTime} onChange={(e) => setBTime(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                         outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
            />
          </div>
          <button
            onClick={book} disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-tsoka-warm text-white text-sm
                       font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? 'Booking…' : 'Book appointment'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {([
          ['requested', 'Requests', counts.requested],
          ['confirmed', 'Upcoming', counts.confirmed],
          ['past', 'Past', counts.past],
        ] as const).map(([k, label, n]) => (
          <button
            key={k} onClick={() => setTab(k as any)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition
              ${tab === k
                ? 'bg-tsoka-deep text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-tsoka-mid'}`}
          >
            {label} ({n})
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
          <Inbox size={26} className="mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">
            {tab === 'requested' ? 'No requests waiting' : 'Nothing here'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {tab === 'requested'
              ? 'Requests from the patient app appear here.'
              : 'Appointments appear here once booked.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {shown.map((a) => {
          const st = STATUS[a.status]
          return (
            <div key={a.id} className={`${card} p-5`}>
              <div className="flex items-start gap-3">
                <span className={`w-10 h-10 rounded-full grid place-items-center shrink-0
                                  text-xs font-bold ${avatarTint(a.patient_id)}`}>
                  {initials(names[a.patient_id] ?? '?')}
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onOpenPatient(a.patient_id)}
                    className="font-semibold text-slate-900 hover:text-tsoka-teal
                               flex items-center gap-1"
                  >
                    {names[a.patient_id] ?? 'Patient'}
                    <ChevronRight size={15} className="text-slate-300" />
                  </button>
                  <p className="text-sm text-slate-700 mt-1 flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-slate-400" />
                    {formatDate(a.scheduled_for)}
                    {a.scheduled_at && ` · ${a.scheduled_at.slice(0, 5)}`}
                  </p>
                  {a.reason && (
                    <p className="text-sm text-slate-500 mt-0.5">{a.reason}</p>
                  )}
                  {a.status === 'requested' && (
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={11} /> Requested {formatDate(a.created_at)}
                    </p>
                  )}
                  {a.staff_note && (
                    <p className="text-sm text-slate-600 mt-2 rounded-lg bg-slate-50
                                  px-3 py-2">{a.staff_note}</p>
                  )}
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px]
                                  font-semibold ring-1 ${st.cls}`}>
                  {st.label}
                </span>
              </div>

              {a.status === 'requested' && (
                <div className="mt-4">
                  {editing === a.id ? (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800 mb-3">
                        Confirm this appointment
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3 mb-3">
                        <label className="text-sm">
                          <span className="block text-xs text-slate-500 mb-1.5">
                            Date (leave to keep {formatDate(a.scheduled_for)})
                          </span>
                          <input
                            type="date" value={newDate} min={today}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200
                                       bg-white text-sm outline-none
                                       focus:ring-2 focus:ring-tsoka-mid/40 transition"
                          />
                        </label>
                        <label className="text-sm">
                          <span className="block text-xs text-slate-500 mb-1.5">Time</span>
                          <input
                            type="time" value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200
                                       bg-white text-sm outline-none
                                       focus:ring-2 focus:ring-tsoka-mid/40 transition"
                          />
                        </label>
                      </div>
                      <input
                        value={note} onChange={(e) => setNote(e.target.value)}
                        placeholder="Message to the patient (optional)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200
                                   bg-white text-sm outline-none
                                   focus:ring-2 focus:ring-tsoka-mid/40 transition"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => confirm(a)} disabled={busy}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm
                                     font-semibold hover:bg-emerald-700 disabled:opacity-50
                                     transition"
                        >
                          {busy ? 'Saving…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => { setEditing(null); setTime(''); setNewDate(''); setNote('') }}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-sm
                                     text-slate-600 bg-white hover:bg-slate-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(a.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                                   border border-slate-200 text-sm font-semibold
                                   text-tsoka-teal hover:bg-slate-50 transition"
                      >
                        <Check size={15} /> Confirm
                      </button>
                      <button
                        onClick={() => setStatus(a.id, 'cancelled')} disabled={busy}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm
                                   font-medium text-slate-600 hover:bg-slate-50 transition"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )}

              {a.status === 'confirmed' && a.scheduled_for <= today && (
                <button
                  onClick={() => setStatus(a.id, 'completed')} disabled={busy}
                  className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                             border border-slate-200 text-sm font-semibold
                             text-emerald-700 hover:bg-emerald-50 transition"
                >
                  <CircleCheck size={15} /> Mark as attended
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
