import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import FootMap from './FootMap'
import Vitals from './Vitals'
import DeviceSimulator from './DeviceSimulator'
import RiskTrend from './RiskTrend'
import ClinicalNotes from './ClinicalNotes'
import MedicalHistory from './MedicalHistory'
import type {
  Patient, Scan, ScanReading, RiskAssessment, FootPosition,
} from '../lib/types'
import { FOOT_POSITIONS, POSITION_LABELS, RISK_STYLES } from '../lib/types'

type Props = {
  patientId: string
  onBack: () => void
}

/** Starting values for the manual entry form, a plausible healthy baseline. */
function blankEntry(): Record<string, string> {
  const o: Record<string, string> = {}
  FOOT_POSITIONS.forEach((p) => {
    o[`L_${p}`] = '31.0'
    o[`R_${p}`] = '31.0'
  })
  return o
}

export default function PatientDetail({ patientId, onBack }: Props) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [scans, setScans] = useState<Scan[]>([])
  const [activeScan, setActiveScan] = useState<string | null>(null)
  const [readings, setReadings] = useState<ScanReading[]>([])
  const [risk, setRisk] = useState<RiskAssessment | null>(null)
  const [error, setError] = useState('')
  const [entering, setEntering] = useState(false)
  const [entry, setEntry] = useState<Record<string, string>>(blankEntry())
  const [saving, setSaving] = useState(false)

  async function loadPatient() {
    const { data } = await supabase
      .from('patients').select('*').eq('id', patientId).single()
    setPatient(data as Patient)
  }

  async function loadScans() {
    const { data } = await supabase
      .from('scans')
      .select('*')
      .eq('patient_id', patientId)
      .order('scanned_at', { ascending: false })
    const list = (data ?? []) as Scan[]
    setScans(list)
    if (list.length && !activeScan) setActiveScan(list[0].id)
  }

  async function loadScanDetail(scanId: string) {
    const [{ data: r }, { data: ra }] = await Promise.all([
      supabase.from('scan_readings').select('*').eq('scan_id', scanId),
      supabase.from('risk_assessments').select('*').eq('scan_id', scanId)
        .order('computed_at', { ascending: false }).limit(1),
    ])
    setReadings((r ?? []) as ScanReading[])
    setRisk(((ra ?? [])[0] ?? null) as RiskAssessment | null)
  }

  useEffect(() => { loadPatient(); loadScans() }, [patientId])
  useEffect(() => { if (activeScan) loadScanDetail(activeScan) }, [activeScan])

  /** Difference between the two feet at each position. */
  const asymmetry: Record<string, number> = {}
  FOOT_POSITIONS.forEach((pos) => {
    const l = readings.find((x) => x.foot === 'L' && x.position === pos)
    const r = readings.find((x) => x.foot === 'R' && x.position === pos)
    if (l && r) asymmetry[pos] = Math.abs(Number(l.temperature_c) - Number(r.temperature_c))
  })

  async function saveScan() {
    setSaving(true)
    setError('')

    const { data: scan, error: e1 } = await supabase
      .from('scans')
      .insert({ patient_id: patientId })
      .select()
      .single()

    if (e1 || !scan) { setError(e1?.message ?? 'Could not create scan'); setSaving(false); return }

    const rows = FOOT_POSITIONS.flatMap((pos) => ([
      { scan_id: scan.id, foot: 'L', position: pos, temperature_c: Number(entry[`L_${pos}`]) },
      { scan_id: scan.id, foot: 'R', position: pos, temperature_c: Number(entry[`R_${pos}`]) },
    ]))

    const { error: e2 } = await supabase.from('scan_readings').insert(rows)
    if (e2) { setError(e2.message); setSaving(false); return }

    // Ask the database to score it. This is the risk engine.
    const { error: e3 } = await supabase.rpc('compute_scan_risk', { p_scan_id: scan.id })
    if (e3) setError(e3.message)

    setEntry(blankEntry())
    setEntering(false)
    setSaving(false)
    setActiveScan(scan.id)
    await loadScans()
    await loadScanDetail(scan.id)
  }

  const style = risk ? RISK_STYLES[risk.risk] : null

  return (
    <div>
      <button onClick={onBack} className="text-sm text-tsoka-teal font-medium mb-4">
        ← All patients
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-tsoka-deep">{patient?.full_name ?? '…'}</h2>
          <p className="text-sm text-slate-500">
            {patient?.phone ?? 'No phone on file'}
            {patient?.diabetes_type ? ` · ${patient.diabetes_type}` : ''}
          </p>
        </div>
        <button
          onClick={() => setEntering(!entering)}
          className="px-4 py-2.5 rounded-lg bg-tsoka-warm text-white font-medium hover:opacity-90"
        >
          {entering ? 'Cancel' : 'New scan'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <DeviceSimulator
        patientId={patientId}
        onComplete={async () => {
          const { data } = await supabase
            .from('scans').select('*')
            .eq('patient_id', patientId)
            .order('scanned_at', { ascending: false })
          const list = (data ?? []) as Scan[]
          setScans(list)
          if (list.length) {
            setActiveScan(list[0].id)
            loadScanDetail(list[0].id)
          }
        }}
      />

      {entering && (
        <div className="mb-6 p-5 rounded-xl bg-white border border-slate-200">
          <p className="font-semibold text-tsoka-deep mb-1">Enter readings</p>
          <p className="text-sm text-slate-500 mb-4">
            Temperatures in °C. The mat will fill these automatically once connected.
          </p>
          <div className="space-y-2.5">
            <div className="grid grid-cols-[1fr_5rem_5rem] gap-3 text-xs font-semibold text-slate-500">
              <span>Position</span><span className="text-center">Left</span><span className="text-center">Right</span>
            </div>
            {FOOT_POSITIONS.map((pos) => (
              <div key={pos} className="grid grid-cols-[1fr_5rem_5rem] gap-3 items-center">
                <span className="text-sm text-slate-700">{POSITION_LABELS[pos]}</span>
                {(['L', 'R'] as const).map((side) => (
                  <input
                    key={side}
                    type="number" step="0.1" inputMode="decimal"
                    className="px-2 py-1.5 rounded-lg border border-slate-300 text-center
                               outline-none focus:ring-2 focus:ring-tsoka-mid"
                    value={entry[`${side}_${pos}`]}
                    onChange={(e) => setEntry({ ...entry, [`${side}_${pos}`]: e.target.value })}
                  />
                ))}
              </div>
            ))}
          </div>
          <button
            onClick={saveScan}
            disabled={saving}
            className="mt-4 px-5 py-2.5 rounded-lg bg-tsoka-teal text-white font-medium
                       hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save and score'}
          </button>
        </div>
      )}

      {scans.length === 0 && !entering && (
        <div className="text-center py-12 rounded-xl bg-white border border-slate-200">
          <p className="text-slate-600 font-medium">No scans yet</p>
          <p className="text-slate-500 text-sm mt-1">Record a scan to see the foot map.</p>
        </div>
      )}

      {scans.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
            {scans.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveScan(s.id)}
                className={`shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium border transition
                  ${activeScan === s.id
                    ? 'bg-tsoka-teal text-white border-tsoka-teal'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-tsoka-mid'}`}
              >
                {new Date(s.scanned_at).toLocaleDateString()}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-5 sm:p-7">
            {style && risk && (
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`px-3.5 py-1.5 rounded-full text-sm font-bold ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
                <span className="text-sm text-slate-600">
                  Largest difference {Number(risk.max_asymmetry_c).toFixed(1)} °C
                  {risk.hottest_position &&
                    ` at the ${POSITION_LABELS[risk.hottest_position as FootPosition].toLowerCase()}`}
                  {risk.hottest_foot && ` on the ${risk.hottest_foot === 'L' ? 'left' : 'right'} foot`}
                </span>
              </div>
            )}
            <FootMap readings={readings} asymmetry={asymmetry} />
          </div>
        </>
      )}

      <RiskTrend patientId={patientId} refreshKey={scans.length} />

      <div className="mt-8">
        <MedicalHistory patientId={patientId} />
      </div>

      <Vitals patientId={patientId} />

      <div className="mt-8">
        <ClinicalNotes patientId={patientId} />
      </div>
    </div>
  )
}
