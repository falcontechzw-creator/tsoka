import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PatientShell from './PatientShell'
import type { PatientNav } from './PatientShell'
import PatientHome from './PatientHome'
import {
  FootHealth, Readings, Medication, Messages, Help, Profile,
} from './PatientPages'
import AppointmentsPatient from './AppointmentsPatient'
import DeleteAccount from '../DeleteAccount'
import { usePatientData } from './usePatientData'
import { Loader2, Clock, LogOut, Footprints } from 'lucide-react'

export default function PatientApp({ email }: { email: string }) {
  const [nav, setNav] = useState<PatientNav>('home')
  const [request, setRequest] = useState<{ status: string; clinic: string | null } | null>(null)
  const [checkedRequest, setCheckedRequest] = useState(false)
  const d = usePatientData()

  // If they have no patient record, find out whether a request is pending.
  useEffect(() => {
    if (d.loading || d.patient) { setCheckedRequest(true); return }
    (async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) { setCheckedRequest(true); return }
      const { data } = await supabase
        .from('link_requests')
        .select('status, clinic_id')
        .eq('user_id', u.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let clinic: string | null = null
      if (data?.clinic_id) {
        const { data: c } = await supabase.from('clinics')
          .select('name').eq('id', data.clinic_id).maybeSingle()
        clinic = c?.name ?? null
      }
      setRequest(data ? { status: data.status, clinic } : null)
      setCheckedRequest(true)
    })()
  }, [d.loading, d.patient])

  if (d.loading || !checkedRequest) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading your health overview…</span>
        </div>
      </div>
    )
  }

  // Signed in, but not yet connected to a clinical record.
  if (!d.patient) {
    const pending = request?.status === 'pending'
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200
                        shadow-sm p-7 text-center">
          <div className="w-12 h-12 rounded-2xl bg-tsoka-mid/10 grid place-items-center
                          mx-auto mb-4">
            {pending
              ? <Clock size={22} className="text-tsoka-teal" />
              : <Footprints size={22} className="text-tsoka-teal" />}
          </div>

          <h1 className="text-lg font-bold text-slate-900">
            {pending ? 'Waiting for your clinic' : 'Your record is not connected yet'}
          </h1>

          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            {pending ? (
              <>
                We have sent your request to{' '}
                <span className="font-medium text-slate-900">
                  {request?.clinic ?? 'your clinic'}
                </span>. A member of staff will match it to your file, usually at your
                next visit. Your results will appear here once that is done.
              </>
            ) : (
              <>
                Your account <span className="font-medium text-slate-900">{email}</span> is
                not connected to a patient record. Speak to your clinic and they will
                connect it for you.
              </>
            )}
          </p>

          {pending && (
            <div className="mt-5 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                This step protects your privacy. Nobody can see a patient record until
                clinic staff have confirmed it belongs to them.
              </p>
            </div>
          )}

          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                       border border-slate-200 text-sm font-semibold text-slate-600
                       hover:bg-slate-50 transition"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <PatientShell
      active={nav}
      onNavigate={setNav}
      name={d.patient.full_name}
      alertCount={d.alerts.length}
      unreadCount={d.unread}
      onSignOut={() => supabase.auth.signOut()}
    >
      {nav === 'home' && <PatientHome d={d} go={setNav} />}
      {nav === 'foot' && <FootHealth d={d} />}
      {nav === 'readings' && <Readings d={d} />}
      {nav === 'appointments' && (
        <AppointmentsPatient
          patientId={d.patient.id}
          clinicId={d.patient.clinic_id}
          clinicName={d.clinicName}
        />
      )}
      {nav === 'medication' && <Medication d={d} />}
      {nav === 'messages' && <Messages d={d} />}
      {nav === 'help' && <Help />}
      {nav === 'profile' && (
        <>
          <Profile d={d} email={email} />
          <DeleteAccount />
        </>
      )}
    </PatientShell>
  )
}
