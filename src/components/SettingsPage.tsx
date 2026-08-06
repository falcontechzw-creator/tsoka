import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { initials, avatarTint, shortId, formatDate } from '../lib/types'
import {
  Link2, Link2Off, Search, Check, X, ShieldCheck, UserCog, UserPlus,
  Info, Loader2, Inbox, Mail, Trash2,
} from 'lucide-react'

type Patient = {
  id: string
  full_name: string
  clinic_id: string | null
  user_id: string | null
  national_id: string | null
}

type Profile = {
  id: string
  full_name: string | null
  role: string
  clinic_id: string | null
}

type LinkRequest = {
  id: string
  email: string | null
  full_name: string | null
  national_id: string | null
  phone: string | null
  clinic_id: string | null
  created_at: string
}

type Invite = {
  id: string
  email: string
  full_name: string | null
  role: string
  clinic_id: string | null
  accepted_at: string | null
  created_at: string
}

type Props = { myRole: string }

const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm'

export default function SettingsPage({ myRole }: Props) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [requests, setRequests] = useState<LinkRequest[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [clinics, setClinics] = useState<Record<string, string>>({})
  const [clinicList, setClinicList] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // which patient record each pending request should attach to
  const [matchFor, setMatchFor] = useState<Record<string, string>>({})

  // new staff invite
  const [invEmail, setInvEmail] = useState('')
  const [invName, setInvName] = useState('')
  const [invRole, setInvRole] = useState('nurse')
  const [invClinic, setInvClinic] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  const isAdmin = myRole === 'clinic_admin' || myRole === 'cimas_admin'

  async function load() {
    setLoading(true)
    const [p, c, pr, lr, iv] = await Promise.all([
      supabase.from('patients')
        .select('id, full_name, clinic_id, user_id, national_id').order('full_name'),
      supabase.from('clinics').select('id, name').order('name'),
      isAdmin
        ? supabase.from('profiles').select('id, full_name, role, clinic_id')
        : Promise.resolve({ data: [] } as any),
      supabase.from('link_requests')
        .select('id, email, full_name, national_id, phone, clinic_id, created_at')
        .eq('status', 'pending').order('created_at', { ascending: false }),
      isAdmin
        ? supabase.from('staff_invites').select('*').order('created_at', { ascending: false })
        : Promise.resolve({ data: [] } as any),
    ])

    setPatients((p.data ?? []) as Patient[])
    const cl = (c.data ?? []) as { id: string; name: string }[]
    setClinicList(cl)
    setClinics(Object.fromEntries(cl.map((x) => [x.id, x.name])))
    if (cl.length) setInvClinic((v) => v || cl[0].id)
    setProfiles((pr.data ?? []) as Profile[])
    setRequests((lr.data ?? []) as LinkRequest[])
    setInvites((iv.data ?? []) as Invite[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approve(reqId: string) {
    const patientId = matchFor[reqId]
    if (!patientId) { setMsg({ kind: 'err', text: 'Choose which patient record this is.' }); return }
    setBusy(true); setMsg(null)
    const { error } = await supabase.rpc('approve_link_request', {
      p_request_id: reqId, p_patient_id: patientId,
    })
    setBusy(false)
    if (error) { setMsg({ kind: 'err', text: error.message }); return }
    setMsg({ kind: 'ok', text: 'Account linked. They will see their results next time they sign in.' })
    load()
  }

  async function reject(reqId: string) {
    setBusy(true); setMsg(null)
    const { error } = await supabase.rpc('reject_link_request', { p_request_id: reqId })
    setBusy(false)
    if (error) { setMsg({ kind: 'err', text: error.message }); return }
    setMsg({ kind: 'ok', text: 'Request dismissed.' })
    load()
  }

  async function unlink(patientId: string) {
    setBusy(true); setMsg(null)
    const { error } = await supabase.rpc('unlink_patient_account', { p_patient_id: patientId })
    setBusy(false)
    if (error) { setMsg({ kind: 'err', text: error.message }); return }
    setMsg({ kind: 'ok', text: 'Account unlinked.' })
    load()
  }

  async function sendInvite() {
    if (!invEmail.trim()) { setMsg({ kind: 'err', text: 'Enter an email address.' }); return }
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('staff_invites').insert({
      email: invEmail.trim().toLowerCase(),
      full_name: invName.trim() || null,
      role: invRole,
      clinic_id: invRole === 'cimas_admin' ? null : (invClinic || null),
    })
    setBusy(false)
    if (error) { setMsg({ kind: 'err', text: error.message }); return }
    setMsg({
      kind: 'ok',
      text: `Invite created. Ask ${invEmail.trim()} to sign up on the login page with this exact email.`,
    })
    setInvEmail(''); setInvName(''); setShowInvite(false)
    load()
  }

  async function removeInvite(id: string) {
    setBusy(true)
    await supabase.from('staff_invites').delete().eq('id', id)
    setBusy(false)
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

  /** Suggest likely matches for a request, by name similarity. */
  function candidates(req: LinkRequest) {
    const unlinked = patients.filter((p) => !p.user_id)
    const name = (req.full_name ?? '').toLowerCase()
    return [...unlinked].sort((a, b) => {
      const sa = name && a.full_name.toLowerCase().includes(name.split(' ')[0]) ? 0 : 1
      const sb = name && b.full_name.toLowerCase().includes(name.split(' ')[0]) ? 0 : 1
      return sa - sb
    })
  }

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

      {/* ---------------- pending patient requests ---------------- */}
      <section className={`${card} p-5 mb-5`}>
        <div className="flex items-center gap-2 mb-1">
          <Inbox size={17} className="text-tsoka-teal" />
          <h2 className="font-semibold text-slate-900">Patients waiting to be connected</h2>
          {requests.length > 0 && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full
                             bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              {requests.length} pending
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-4">
          These people signed up on the app and chose your clinic. Match each one to their
          record before approving, so nobody is connected to the wrong file.
        </p>

        {loading && (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </p>
        )}

        {!loading && requests.length === 0 && (
          <p className="text-sm text-slate-500 py-4">No requests waiting.</p>
        )}

        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span className={`w-10 h-10 rounded-full grid place-items-center shrink-0
                                  text-xs font-bold ${avatarTint(r.id)}`}>
                  {initials(r.full_name ?? '?')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {r.full_name ?? 'Unnamed'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.email}</p>
                  <p className="text-xs text-slate-500">
                    {r.national_id && `ID ${r.national_id} · `}
                    {r.phone && `${r.phone} · `}
                    {r.clinic_id ? clinics[r.clinic_id] ?? '' : 'No clinic chosen'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Requested {formatDate(r.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <select
                  value={matchFor[r.id] ?? ''}
                  onChange={(e) => setMatchFor({ ...matchFor, [r.id]: e.target.value })}
                  aria-label="Match to patient record"
                  className="flex-1 min-w-[220px] px-3.5 py-2 rounded-xl border
                             border-slate-200 bg-white text-sm outline-none
                             focus:ring-2 focus:ring-tsoka-mid/40 transition"
                >
                  <option value="">Match to a patient record…</option>
                  {candidates(r).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                      {p.national_id ? ` · ${p.national_id}` : ` · ${shortId(p.id)}`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => approve(r.id)} disabled={busy}
                  className="px-4 py-2 rounded-xl bg-tsoka-deep text-white text-sm
                             font-semibold hover:bg-tsoka-teal disabled:opacity-50 transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(r.id)} disabled={busy}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm
                             font-medium text-slate-600 hover:bg-white transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- linked accounts ---------------- */}
      <section className={`${card} p-5 mb-5`}>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Link2 size={17} className="text-tsoka-teal" />
          <h2 className="font-semibold text-slate-900">Patient app accounts</h2>
          <span className="text-xs text-slate-500 ml-auto">
            {linked} of {patients.length} linked
          </span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Who currently has access to their own results.
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

        <ul className="divide-y divide-slate-100">
          {shown.map((p) => (
            <li key={p.id} className="py-3 flex items-center gap-3">
              <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0
                                text-xs font-bold ${avatarTint(p.id)}`}>
                {initials(p.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 truncate">{p.full_name}</p>
                <p className="text-xs text-slate-500">
                  {p.national_id ?? shortId(p.id)}
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
                <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium
                                 bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                  No account
                </span>
              )}
            </li>
          ))}
        </ul>

        {!loading && shown.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center">No patients match.</p>
        )}
      </section>

      {/* ---------------- staff ---------------- */}
      {isAdmin ? (
        <>
          <section className={`${card} p-5 mb-5`}>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <UserPlus size={17} className="text-tsoka-teal" />
              <h2 className="font-semibold text-slate-900">Invite staff</h2>
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="ml-auto px-3.5 py-1.5 rounded-lg bg-tsoka-deep text-white
                           text-xs font-semibold hover:bg-tsoka-teal transition"
              >
                {showInvite ? 'Cancel' : 'New invite'}
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Register their email here first. When they sign up on the login page with
              that same address, they are given this role and clinic automatically.
            </p>

            {showInvite && (
              <div className="mb-4 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="email" value={invEmail}
                    onChange={(e) => setInvEmail(e.target.value)}
                    placeholder="Email address"
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                               outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
                  />
                  <input
                    type="text" value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="Full name (optional)"
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                               outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
                  />
                  <select
                    value={invRole} onChange={(e) => setInvRole(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white
                               text-sm outline-none focus:ring-2 focus:ring-tsoka-mid/40"
                  >
                    <option value="nurse">Nurse</option>
                    <option value="clinic_admin">Clinic admin</option>
                    {myRole === 'cimas_admin' && (
                      <option value="cimas_admin">Cimas admin</option>
                    )}
                  </select>
                  <select
                    value={invClinic} onChange={(e) => setInvClinic(e.target.value)}
                    disabled={invRole === 'cimas_admin'}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white
                               text-sm outline-none focus:ring-2 focus:ring-tsoka-mid/40
                               disabled:opacity-50"
                  >
                    {clinicList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={sendInvite} disabled={busy}
                  className="px-4 py-2.5 rounded-xl bg-tsoka-warm text-white text-sm
                             font-semibold hover:opacity-90 disabled:opacity-50 transition"
                >
                  {busy ? 'Creating…' : 'Create invite'}
                </button>
              </div>
            )}

            {invites.length === 0 ? (
              <p className="text-sm text-slate-500">No invites yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {invites.map((i) => (
                  <li key={i.id} className="py-2.5 flex items-center gap-3">
                    <Mail size={15} className="text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {i.email}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {i.role.replace('_', ' ')}
                        {i.clinic_id && ` · ${clinics[i.clinic_id] ?? ''}`}
                      </p>
                    </div>
                    {i.accepted_at ? (
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-xs
                                       font-semibold bg-emerald-50 text-emerald-700
                                       ring-1 ring-emerald-200">
                        Accepted
                      </span>
                    ) : (
                      <>
                        <span className="shrink-0 px-2.5 py-1 rounded-full text-xs
                                         font-medium bg-amber-50 text-amber-700
                                         ring-1 ring-amber-200">
                          Waiting
                        </span>
                        <button
                          onClick={() => removeInvite(i.id)} disabled={busy}
                          aria-label={`Remove invite for ${i.email}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600
                                     hover:bg-rose-50 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${card} p-5`}>
            <div className="flex items-center gap-2 mb-1">
              <UserCog size={17} className="text-tsoka-teal" />
              <h2 className="font-semibold text-slate-900">Staff access</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Change what existing staff can see.
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
                    value={p.role} onChange={(e) => setRole(p.id, e.target.value)}
                    disabled={busy} aria-label="Role"
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
                    disabled={busy} aria-label="Clinic"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white
                               text-xs outline-none focus:ring-2 focus:ring-tsoka-mid/40"
                  >
                    <option value="">No clinic (sees all)</option>
                    {clinicList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section className={`${card} p-5 flex items-start gap-3`}>
          <ShieldCheck size={18} className="text-tsoka-teal shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-900 text-sm">Staff access</p>
            <p className="text-sm text-slate-500 mt-1">
              Only clinic administrators can invite staff or change roles.
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
            every clinic. A patient sees only their own record. A patient signing up
            never gains access to a record until a member of staff has matched and
            approved it. These rules are enforced by the database itself, not just
            hidden in this interface.
          </p>
        </div>
      </div>
    </div>
  )
}
