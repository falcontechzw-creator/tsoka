import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { RISK_STYLES, formatDate } from '../lib/types'
import type { RiskLevel } from '../lib/types'
import { Footprints, LogOut, CalendarClock, Info } from 'lucide-react'

type Props = { email: string }

type Latest = {
  risk: RiskLevel
  max_asymmetry_c: number
  computed_at: string
} | null

export default function PatientHome({ email }: Props) {
  const [patientId, setPatientId] = useState<string | null>(null)
  const [name, setName] = useState<string>('')
  const [latest, setLatest] = useState<Latest>(null)
  const [nextAppt, setNextAppt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser()
      const uid = u.user?.id
      if (!uid) { setLoading(false); return }

      const { data: p } = await supabase
        .from('patients')
        .select('id, full_name, next_appointment')
        .eq('user_id', uid)
        .maybeSingle()

      if (p) {
        setPatientId(p.id)
        setName(p.full_name)
        setNextAppt(p.next_appointment)
        const { data: r } = await supabase
          .from('risk_assessments')
          .select('risk, max_asymmetry_c, computed_at')
          .eq('patient_id', p.id)
          .order('computed_at', { ascending: false })
          .limit(1)
        setLatest(((r ?? [])[0] ?? null) as Latest)
      }
      setLoading(false)
    })()
  }, [])

  const s = latest ? RISK_STYLES[latest.risk] : null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-tsoka-deep">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center">
              <Footprints size={18} className="text-tsoka-warm" strokeWidth={2.2} />
            </div>
            <p className="text-white font-bold tracking-tight">Tsoka</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Hello{name ? `, ${name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 mb-6">
          Your foot health at a glance.
        </p>

        {loading && <p className="text-sm text-slate-500">Loading…</p>}

        {!loading && !patientId && (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <Info size={22} className="text-tsoka-teal mb-3" />
            <p className="font-semibold text-slate-900">Your record isn't linked yet</p>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Your account ({email}) is not yet connected to a patient record. Ask the
              clinic to link it at your next visit, and your screening results will
              appear here.
            </p>
          </div>
        )}

        {!loading && patientId && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <p className="text-sm text-slate-500 mb-3">Latest screening</p>
              {latest && s ? (
                <>
                  <span className={`inline-block px-3.5 py-1.5 rounded-full text-sm
                                    font-bold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
                    {s.label}
                  </span>
                  <p className="text-sm text-slate-600 mt-3">
                    Largest temperature difference {Number(latest.max_asymmetry_c).toFixed(1)} °C,
                    recorded {formatDate(latest.computed_at)}.
                  </p>
                  {latest.risk !== 'green' && (
                    <p className="mt-3 text-sm text-amber-900 bg-amber-50 ring-1
                                  ring-amber-200 rounded-xl px-3.5 py-2.5">
                      Please arrange to see a nurse for a closer look at your foot.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  No screening recorded yet. Visit your clinic to be screened on the mat.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-2">
                <CalendarClock size={14} /> Next appointment
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {nextAppt ? formatDate(nextAppt) : 'Not scheduled'}
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed px-1">
              Tsoka is a screening and early warning tool. It does not provide a medical
              diagnosis. Always follow the advice of your nurse or doctor.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
