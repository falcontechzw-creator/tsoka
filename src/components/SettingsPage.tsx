import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { initials, avatarTint, shortId } from '../lib/types'
import {
  Link2, Link2Off, Search, Check, X, ShieldCheck, UserCog,
  Info, Loader2, 
} from 'lucide-react'

type Patient = {
  id: string
  full_name: string
  clinic_id: string | null
  user_id: string | null
}

type Profile = {
  id: string
  full_name: string | null
  role: string
  clinic_id: string | null
}

type Props = { myRole: string }

const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm'

export default function SettingsPage({ myRole }: Props) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [clinics, setClinics] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [linking, setLinking] = useState<string | null>(null)
  const [emailFor, setEmailFor] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const isAdmin = myRole === 'clinic_admin' || myRole === 'cimas_admin'

  async function load() {
    setLoading(true)
    const [p, c, pr] = await Promise.all([
      supabase.from('patients').select('id, full_name, clinic_id, user_id')
        .order('full_name'),
      supabase.from('clinics').select('id, name').order('name'),
      isAdmin
        ? supabase.from('profiles').select('id, full_name, role, clinic_id')
        : Promise.resolve({ data: [] } as any),
    ])
    setPatients((p.data ?? []) as Patient[])
    setClinics(Object.fromEntries((c.data ?? []).map((x: any) => [x.id, x.name])))
    setProfiles((pr.data ?? []) as Profile[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function link(patientId: string) {
    const email = (emailFor[patientId] ?? '').trim()
    if (!email) { setMsg({ kind: 'err', text: 'Enter the email they signed up with.' }); return }
    setBusy(true); setMsg(null)

    const { error } = await supabase.rpc('link_patient_account', {
      p_patient_id: patientId,
      p_email: email,
    })
    setBusy(false)

    if (error) { setMsg({ kind: 'err', text: error.message }); return }
    setMsg({ kind: 'ok', text: 'Account linked. They will see their results next time they sign in.' })
    setLinking(null)
    setEmailFor({ ...emailFor, [patientId]: '' })
    load()
  }

  async function unlink(patientId: string) {
    setBusy(true); setMsg(null)
    const { error } = await supabase.rpc('unlink_patient_account', {
      p_patient_id: patientId,
    })
    setBusy(false)
    if (error) { setMsg({ kind: 'err', text: error.message }); return }
    setMsg({ kind: 'ok', text: 'Account unlinked.' })
    load()
  }

  async function setRole(id: string, role: string) {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    setBusy(false)
    if (error) { setMsg({ kind: 'err', text: error.message }); return }
    setMsg({ kind: 'ok', text: 'Role updated.' })
    load()
  }

  async function setStaffClinic(id: string, clinic_id: string) {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('profiles')
      .update({ clinic_id: clinic_id || null }).eq('id', id)
    setBusy(false)
    if (error) { setMsg({ kind: 'err', text: error.message }); return }
    setMsg({ kind: 'ok', text: 'Clinic updated.' })
    load()
  }

  const shown = patients.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase().trim()),
  )
  const linked = patients.filter((p) => p.user_id).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Patient accounts and staff access.
        </p>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ring-1 flex items-start gap-2.5
          ${msg.kind === 'ok'
            ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
            : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
          {msg.kind === 'ok' ? <Check size={16} className="mt-0.5 shrink-0" />
                             : <X size={16} className="mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto shrink-0 opacity-60">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ---------------- patient account linking ---------------- */}
      <section className={`${card} p-5 mb-5`}>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Link2 size={17} className="text-tsoka-teal" />
          <h2 className="font-semibold text-slate-900">Patient app accounts</h2>
          <span className="text-xs text-slate-500 ml-auto">
            {linked} of {patients.length} linked
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          A patient signs up on the login page, then you connect their account here so
          they can see their own results.
        </p>

        <div className="relative mb-4">
          <Search size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients"
            aria-label="Search patients"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm
                       outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
          />
        </div>

        {loading && (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {shown.map((p) => (
            <li key={p.id} className="py-3">
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0
                                  text-xs font-bold ${avatarTint(p.id)}`}>
                  {initials(p.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{p.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {shortId(p.id)}
                    {p.clinic_id && ` · ${clinics[p.clinic_id] ?? ''}`}
                  </p>
                </div>

                {p.user_id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold
                                     bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                      Linked
                    </span>
                    <button
                      onClick={() => unlink(p.id)} disabled={busy}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600
                                 hover:bg-rose-50 transition disabled:opacity-40"
                      aria-label={`Unlink ${p.full_name}`}
                    >
                      <Link2Off size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setLinking(linking === p.id ? null : p.id)}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200
                               text-xs font-semibold text-tsoka-teal hover:bg-slate-50
                               transition"
                  >
                    {linking === p.id ? 'Cancel' : 'Link account'}
                  </button>
                )}
              </div>

              {linking === p.id && (
                <div className="mt-3 ml-12 flex flex-wrap gap-2">
                  <input
                    type="email"
                    value={emailFor[p.id] ?? ''}
                    onChange={(e) => setEmailFor({ ...emailFor, [p.id]: e.target.value })}
                    placeholder="Email they signed up with"
                    className="flex-1 min-w-[220px] px-3.5 py-2 rounded-xl border
                               border-slate-200 text-sm outline-none
                               focus:ring-2 focus:ring-tsoka-mid/40 transition"
                    onKeyDown={(e) => e.key === 'Enter' && link(p.id)}
                  />
                  <button
                    onClick={() => link(p.id)} disabled={busy}
                    className="px-4 py-2 rounded-xl bg-tsoka-deep text-white text-sm
                               font-semibold hover:bg-tsoka-teal disabled:opacity-50
                               transition"
                  >
                    {busy ? 'Linking…' : 'Link'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {!loading && shown.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center">No patients match.</p>
        )}
      </section>

      {/* ---------------- staff access ---------------- */}
      {isAdmin ? (
        <section className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-1">
            <UserCog size={17} className="text-tsoka-teal" />
            <h2 className="font-semibold text-slate-900">Staff access</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            New staff accounts are created in Supabase, then given a role and clinic here.
          </p>

          <ul className="divide-y divide-slate-100">
            {profiles.filter((p) => p.role !== 'patient').map((p) => (
              <li key={p.id} className="py-3 flex flex-wrap items-center gap-3">
                <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0
                                  text-xs font-bold ${avatarTint(p.id)}`}>
                  {initials(p.full_name ?? '?')}
                </span>
                <p className="font-medium text-slate-900 min-w-[140px] flex-1 truncate
                              capitalize">
                  {p.full_name ?? 'Unnamed'}
                </p>

                <select
                  value={p.role}
                  onChange={(e) => setRole(p.id, e.target.value)}
                  disabled={busy}
                  aria-label="Role"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white
                             text-xs outline-none focus:ring-2 focus:ring-tsoka-mid/40"
                >
                  <option value="nurse">Nurse</option>
                  <option value="clinic_admin">Clinic admin</option>
                  {myRole === 'cimas_admin' && (
                    <option value="cimas_admin">Cimas admin</option>
                  )}
                  <option value="patient">Patient</option>
                </select>

                <select
                  value={p.clinic_id ?? ''}
                  onChange={(e) => setStaffClinic(p.id, e.target.value)}
                  disabled={busy}
                  aria-label="Clinic"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white
                             text-xs outline-none focus:ring-2 focus:ring-tsoka-mid/40"
                >
                  <option value="">No clinic (sees all)</option>
                  {Object.entries(clinics).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          {profiles.filter((p) => p.role !== 'patient').length === 0 && (
            <p className="text-sm text-slate-500 py-6 text-center">
              No staff accounts found.
            </p>
          )}
        </section>
      ) : (
        <section className={`${card} p-5 flex items-start gap-3`}>
          <ShieldCheck size={18} className="text-tsoka-teal shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900 text-sm">Staff access</p>
            <p className="text-sm text-slate-500 mt-1">
              Only clinic administrators can change roles and clinic assignments.
            </p>
          </div>
        </section>
      )}

      <div className="mt-5 rounded-2xl bg-slate-100 p-5 flex items-start gap-3">
        <Info size={17} className="text-slate-500 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800 mb-1">How access works</p>
          <p>
            A nurse sees only patients at their own clinic. A Cimas administrator sees
            every clinic. A patient sees only their own record. These rules are enforced
            by the database itself, not just hidden in this interface.
          </p>
        </div>
      </div>
    </div>
  )
}
