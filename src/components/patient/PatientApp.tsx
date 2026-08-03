import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import PatientShell from './PatientShell'
import type { PatientNav } from './PatientShell'
import PatientHome from './PatientHome'
import {
  FootHealth, Readings, Appointments, Medication, Messages, Help, Profile,
} from './PatientPages'
import { usePatientData } from './usePatientData'
import { Loader2, Info, LogOut } from 'lucide-react'

export default function PatientApp({ email }: { email: string }) {
  const [nav, setNav] = useState<PatientNav>('home')
  const d = usePatientData()

  if (d.loading) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading your health overview…</span>
        </div>
      </div>
    )
  }

  // Signed in, but no patient record is linked to this account yet.
  if (!d.patient) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200
                        shadow-sm p-7 text-center">
          <div className="w-12 h-12 rounded-2xl bg-tsoka-mid/10 grid place-items-center
                          mx-auto mb-4">
            <Info size={22} className="text-tsoka-teal" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Your record is not linked yet
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Your account <span className="font-medium text-slate-900">{email}</span> is
            not yet connected to a patient record. Ask your clinic to link it at your
            next visit, and your screening results will appear here.
          </p>
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
      {nav === 'appointments' && <Appointments d={d} />}
      {nav === 'medication' && <Medication d={d} />}
      {nav === 'messages' && <Messages d={d} />}
      {nav === 'help' && <Help />}
      {nav === 'profile' && <Profile d={d} email={email} />}
    </PatientShell>
  )
}
