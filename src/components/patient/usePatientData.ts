import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RiskLevel, ScanReading, FootPosition } from '../../lib/types'
import { FOOT_POSITIONS } from '../../lib/types'

export type PatientRecord = {
  id: string
  full_name: string
  next_appointment: string | null
  next_appointment_time: string | null
  clinic_id: string | null
  medical_history: string | null
  allergies: string | null
  diabetes_type: string | null
  phone: string | null
}

export type RiskPoint = {
  id: string
  risk: RiskLevel
  max_asymmetry_c: number
  computed_at: string
  hottest_position: FootPosition | null
}

export type Vital = {
  id: string
  recorded_at: string
  glucose_mmol: number | null
  systolic: number | null
  diastolic: number | null
  weight_kg: number | null
}

export type Medication = {
  id: string
  name: string
  dosage: string | null
  instructions: string | null
  time_of_day: string | null
  active: boolean
}

export type Message = {
  id: string
  sender_name: string | null
  from_clinic: boolean
  body: string
  read_at: string | null
  created_at: string
}

export type AlertRow = {
  id: string
  message: string | null
  status: string
  created_at: string
}

export function usePatientData() {
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState<PatientRecord | null>(null)
  const [clinicName, setClinicName] = useState<string | null>(null)
  const [risks, setRisks] = useState<RiskPoint[]>([])
  const [readings, setReadings] = useState<ScanReading[]>([])
  const [lastScanAt, setLastScanAt] = useState<string | null>(null)
  const [vitals, setVitals] = useState<Vital[]>([])
  const [meds, setMeds] = useState<Medication[]>([])
  const [takenToday, setTakenToday] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<Message[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: u } = await supabase.auth.getUser()
    const uid = u.user?.id
    if (!uid) { setLoading(false); return }

    const { data: p } = await supabase
      .from('patients')
      .select(`id, full_name, next_appointment, next_appointment_time, clinic_id,
               medical_history, allergies, diabetes_type, phone`)
      .eq('user_id', uid)
      .maybeSingle()

    if (!p) { setPatient(null); setLoading(false); return }
    setPatient(p as PatientRecord)

    const today = new Date().toISOString().slice(0, 10)

    const [c, r, v, m, ml, msg, al, sc] = await Promise.all([
      p.clinic_id
        ? supabase.from('clinics').select('name').eq('id', p.clinic_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase.from('risk_assessments')
        .select('id, risk, max_asymmetry_c, computed_at, hottest_position, scan_id')
        .eq('patient_id', p.id).order('computed_at', { ascending: true }).limit(24),
      supabase.from('vitals').select('*')
        .eq('patient_id', p.id).order('recorded_at', { ascending: false }).limit(30),
      supabase.from('medications').select('*')
        .eq('patient_id', p.id).eq('active', true).order('created_at'),
      supabase.from('medication_logs').select('medication_id')
        .eq('patient_id', p.id).eq('taken_on', today),
      supabase.from('messages').select('*')
        .eq('patient_id', p.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('alerts').select('id, message, status, created_at')
        .eq('patient_id', p.id).eq('status', 'open')
        .order('created_at', { ascending: false }),
      supabase.from('scans').select('id, scanned_at')
        .eq('patient_id', p.id).order('scanned_at', { ascending: false }).limit(1),
    ])

    setClinicName((c as any)?.data?.name ?? null)
    setRisks((r.data ?? []) as RiskPoint[])
    setVitals((v.data ?? []) as Vital[])
    setMeds((m.data ?? []) as Medication[])
    setTakenToday(new Set((ml.data ?? []).map((x: any) => x.medication_id)))
    setMessages((msg.data ?? []) as Message[])
    setAlerts((al.data ?? []) as AlertRow[])

    const latestScan = (sc.data ?? [])[0] as any
    if (latestScan) {
      setLastScanAt(latestScan.scanned_at)
      const { data: rd } = await supabase.from('scan_readings')
        .select('*').eq('scan_id', latestScan.id)
      setReadings((rd ?? []) as ScanReading[])
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /** Difference between the two feet at each sensor position. */
  const asymmetry: Record<string, number> = {}
  FOOT_POSITIONS.forEach((pos) => {
    const l = readings.find((x) => x.foot === 'L' && x.position === pos)
    const r = readings.find((x) => x.foot === 'R' && x.position === pos)
    if (l && r) asymmetry[pos] = Math.abs(Number(l.temperature_c) - Number(r.temperature_c))
  })

  const latestRisk = risks.length ? risks[risks.length - 1] : null
  const latestVital = vitals[0] ?? null
  const unread = messages.filter((m) => m.from_clinic && !m.read_at).length

  return {
    loading, patient, clinicName, risks, readings, asymmetry, lastScanAt,
    vitals, latestVital, meds, takenToday, messages, alerts, latestRisk, unread,
    reload: load,
  }
}