import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import AppShell from './components/AppShell'
import type { NavKey } from './components/AppShell'
import PatientsPage from './components/PatientsPage'
import PatientDetail from './components/PatientDetail'
import Dashboard from './components/Dashboard'
import DevicesPage from './components/DevicesPage'
import LoginPage from './components/LoginPage'
import PatientApp from './components/patient/PatientApp'
import SettingsPage from './components/SettingsPage'
import SurveyPage from './components/SurveyPage'
import SurveyResults from './components/SurveyResults'
import AlertsPage from './components/AlertsPage'
import AppointmentsStaff from './components/AppointmentsStaff'
import ConnectionBanner from './components/ConnectionBanner'
import { startQueue } from './lib/offline'
import { Loader2 } from 'lucide-react'

type Role = 'patient' | 'nurse' | 'clinic_admin' | 'cimas_admin'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [role, setRole] = useState<Role | null>(null)
  const [clinicName, setClinicName] = useState<string | null>(null)
  const [nav, setNav] = useState<NavKey>('patients')
  const [openPatient, setOpenPatient] = useState<string | null>(null)
  const [alertCount, setAlertCount] = useState(0)

  // Start watching for the connection coming back.
  useEffect(() => { startQueue() }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setRole(null); setChecking(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Work out the signed-in user's role, then route accordingly.
  useEffect(() => {
    if (!session) return
    setChecking(true)
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role, clinic_id')
        .eq('id', session.user.id)
        .maybeSingle()

      setRole((data?.role ?? 'patient') as Role)

      if (data?.clinic_id) {
        const { data: c } = await supabase
          .from('clinics').select('name').eq('id', data.clinic_id).maybeSingle()
        setClinicName(c?.name ?? null)
      }
      setChecking(false)
    })()
  }, [session])

  useEffect(() => {
    if (!session || role === 'patient') return
    supabase.from('alerts').select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .then(({ count }) => setAlertCount(count ?? 0))
  }, [session, role, nav, openPatient])

  // Public questionnaire, no sign in needed.
  if (window.location.pathname.startsWith('/survey')) return <SurveyPage />

  if (!session) return <LoginPage />

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    )
  }

  // Patients get their own interface.
  if (role === 'patient') {
    return (
      <>
        <ConnectionBanner />
        <PatientApp email={session.user.email ?? ''} />
      </>
    )
  }

  return (
    <>
      <ConnectionBanner />
      <AppShell
        active={nav}
        onNavigate={(k) => { setNav(k); setOpenPatient(null) }}
        userEmail={session.user.email ?? 'user'}
        clinicName={clinicName ?? (role === 'cimas_admin' ? 'Cimas Health Group' : null)}
        alertCount={alertCount}
        onSignOut={() => supabase.auth.signOut()}
      >
        {nav === 'patients' && (
          openPatient
            ? <PatientDetail patientId={openPatient} onBack={() => setOpenPatient(null)} />
            : <PatientsPage onOpen={setOpenPatient} />
        )}
        {nav === 'overview' && (
          <Dashboard onOpenPatient={(id) => { setOpenPatient(id); setNav('patients') }} />
        )}
        {nav === 'alerts' && (
          <AlertsPage onOpenPatient={(id) => { setOpenPatient(id); setNav('patients') }} />
        )}
        {nav === 'appointments' && (
          <AppointmentsStaff onOpenPatient={(id) => { setOpenPatient(id); setNav('patients') }} />
        )}
        {nav === 'reports' && <SurveyResults />}
        {nav === 'devices' && <DevicesPage />}
        {nav === 'settings' && <SettingsPage myRole={role ?? 'nurse'} />}
      </AppShell>
    </>
  )
}
