export type RiskLevel = 'green' | 'amber' | 'red'
export type FootSide = 'L' | 'R'
export type FootPosition = 'hallux' | 'met1' | 'met3' | 'met5' | 'heel' | 'midfoot'

export const FOOT_POSITIONS: FootPosition[] = [
  'hallux', 'met1', 'met3', 'met5', 'midfoot', 'heel',
]

export const POSITION_LABELS: Record<FootPosition, string> = {
  hallux: 'Big toe',
  met1: '1st metatarsal',
  met3: '3rd metatarsal',
  met5: '5th metatarsal',
  midfoot: 'Midfoot',
  heel: 'Heel',
}

export type Clinic = {
  id: string
  name: string
  city: string | null
}

export type Patient = {
  id: string
  full_name: string
  national_id: string | null
  phone: string | null
  date_of_birth: string | null
  diabetes_type: string | null
  clinic_id: string | null
  enrolled_at: string
}

export type PatientWithRisk = Patient & {
  risk: RiskLevel | null
  max_asymmetry_c: number | null
  last_scan: string | null
}

export type Scan = {
  id: string
  patient_id: string
  scanned_at: string
  notes: string | null
}

export type ScanReading = {
  id: string
  scan_id: string
  foot: FootSide
  position: FootPosition
  temperature_c: number
}

export type RiskAssessment = {
  id: string
  scan_id: string
  patient_id: string
  max_asymmetry_c: number
  hottest_position: FootPosition | null
  hottest_foot: FootSide | null
  risk: RiskLevel
  computed_at: string
}

/** Colour a reading by how far it sits above its partner on the other foot. */
export function asymmetryColor(diff: number): string {
  if (diff >= 2.2) return '#C1432E'
  if (diff >= 1.5) return '#E8763A'
  if (diff >= 0.8) return '#E0B44A'
  return '#0E7C86'
}

export const RISK_STYLES: Record<RiskLevel, {
  bg: string; text: string; ring: string; bar: string; label: string
}> = {
  red: {
    bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200',
    bar: 'bg-rose-500', label: 'High risk',
  },
  amber: {
    bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200',
    bar: 'bg-amber-400', label: 'Moderate risk',
  },
  green: {
    bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200',
    bar: 'bg-emerald-500', label: 'Low risk',
  },
}

/* ---------- small display helpers ---------- */

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

/** A short, stable, human-readable id derived from the uuid. */
export function shortId(uuid: string): string {
  const digits = uuid.replace(/\D/g, '').slice(-6).padStart(6, '0')
  return `TS-${digits}`
}

export function ageFrom(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

/** Deterministic soft avatar tint so a patient always looks the same. */
export function avatarTint(id: string): string {
  const tints = [
    'bg-teal-100 text-teal-700',
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-emerald-100 text-emerald-700',
  ]
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997
  return tints[h % tints.length]
}