import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { FOOT_POSITIONS } from '../lib/types'

type Props = {
  patientId: string
  onComplete: () => void
}

type Scenario = 'healthy' | 'early' | 'urgent'

const SCENARIOS: Record<Scenario, { label: string; hint: string }> = {
  healthy: { label: 'Healthy foot',  hint: 'Both feet within normal range' },
  early:   { label: 'Early warning', hint: 'A spot beginning to warm' },
  urgent:  { label: 'Urgent',        hint: 'Clear asymmetry needing review' },
}

/** Build a plausible set of readings for the chosen scenario. */
function buildReadings(scenario: Scenario) {
  const base = 30.8
  const jitter = () => (Math.random() - 0.5) * 0.4

  // Which point gets hot, and by how much.
  const hotPosition = 'hallux'
  const bump = scenario === 'urgent' ? 2.6 + Math.random() * 0.6
             : scenario === 'early'  ? 1.6 + Math.random() * 0.4
             : 0

  return FOOT_POSITIONS.flatMap((position) => {
    const left = base + jitter()
    const right = base + jitter() + (position === hotPosition ? bump : 0)
    return [
      { foot: 'L', position, temperature_c: Number(left.toFixed(1)) },
      { foot: 'R', position, temperature_c: Number(right.toFixed(1)) },
    ]
  })
}

export default function DeviceSimulator({ patientId, onComplete }: Props) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState('')

  async function runScan(scenario: Scenario) {
    setError('')
    setResult('')
    setScanning(true)

    // Mimic the twenty second read, shortened so a demo stays watchable.
    for (let i = 5; i > 0; i--) {
      setCountdown(i)
      await new Promise((r) => setTimeout(r, 600))
    }
    setCountdown(0)

    const { data, error } = await supabase.rpc('ingest_scan', {
      p_device_key: 'tsoka-demo-key-001',
      p_patient_id: patientId,
      p_readings: buildReadings(scenario),
    })

    setScanning(false)

    if (error) { setError(error.message); return }

    const r = data as any
    setResult(
      `Scan complete. Risk ${r.risk}` +
      (r.max_asymmetry ? `, largest difference ${Number(r.max_asymmetry).toFixed(1)} °C.` : '.'),
    )
    onComplete()
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm font-medium text-tsoka-teal hover:underline"
      >
        {open ? 'Hide mat' : 'Use the mat'}
      </button>

      {open && (
        <div className="mt-3 rounded-xl bg-tsoka-deep p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-white font-semibold text-sm">Mat 001 connected</p>
          </div>
          <p className="text-tsoka-wash/60 text-sm mb-4">
            Ask the patient to stand on the mat, then start the reading.
          </p>

          {scanning ? (
            <div className="py-6 text-center">
              <p className="text-4xl font-bold text-tsoka-warm mb-1">
                {countdown || '…'}
              </p>
              <p className="text-tsoka-wash/70 text-sm">Reading both feet, hold still</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-2">
              {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
                <button
                  key={s}
                  onClick={() => runScan(s)}
                  className="text-left px-3.5 py-3 rounded-lg bg-white/10 hover:bg-white/20
                             transition"
                >
                  <p className="text-white font-medium text-sm">{SCENARIOS[s].label}</p>
                  <p className="text-tsoka-wash/50 text-xs mt-0.5">{SCENARIOS[s].hint}</p>
                </button>
              ))}
            </div>
          )}

          {result && (
            <p className="mt-4 text-sm text-emerald-300">{result}</p>
          )}
          {error && (
            <p className="mt-4 text-sm text-red-300">{error}</p>
          )}

          <p className="mt-4 text-xs text-tsoka-wash/40">
            Simulated readings for testing. The physical mat posts to the same endpoint.
          </p>
        </div>
      )}
    </div>
  )
}
