import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Point = {
  computed_at: string
  max_asymmetry_c: number
  risk: 'green' | 'amber' | 'red'
}

type Props = { patientId: string; refreshKey?: number }

const RISK_DOT: Record<string, string> = {
  green: '#2A9D63',
  amber: '#E8763A',
  red: '#C1432E',
}

export default function RiskTrend({ patientId, refreshKey }: Props) {
  const [points, setPoints] = useState<Point[]>([])

  useEffect(() => {
    supabase
      .from('risk_assessments')
      .select('computed_at, max_asymmetry_c, risk')
      .eq('patient_id', patientId)
      .order('computed_at', { ascending: true })
      .limit(20)
      .then(({ data }) => setPoints((data ?? []) as Point[]))
  }, [patientId, refreshKey])

  if (points.length < 2) return null

  const W = 640
  const H = 200
  const padL = 34
  const padR = 12
  const padT = 14
  const padB = 28

  const values = points.map((p) => Number(p.max_asymmetry_c))
  const maxV = Math.max(3.0, ...values) * 1.1
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const x = (i: number) =>
    padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const y = (v: number) => padT + plotH - (v / maxV) * plotH

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(Number(p.max_asymmetry_c)).toFixed(1)}`)
    .join(' ')

  const area =
    `${line} L ${x(points.length - 1).toFixed(1)} ${padT + plotH} L ${padL} ${padT + plotH} Z`

  const latest = points[points.length - 1]
  const first = points[0]
  const change = Number(latest.max_asymmetry_c) - Number(first.max_asymmetry_c)

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h3 className="font-bold text-tsoka-deep">Trend over time</h3>
        <p className="text-sm text-slate-500">
          {change > 0.2
            ? `Rising, up ${change.toFixed(1)} °C since the first scan`
            : change < -0.2
              ? `Improving, down ${Math.abs(change).toFixed(1)} °C since the first scan`
              : 'Stable across scans'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
             aria-label="Largest temperature difference across scans">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#0E7C86" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0E7C86" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* threshold bands */}
          <line x1={padL} x2={W - padR} y1={y(2.2)} y2={y(2.2)}
                stroke="#C1432E" strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
          <text x={W - padR} y={y(2.2) - 5} textAnchor="end"
                fontSize="10" fill="#C1432E">2.2 review</text>

          <line x1={padL} x2={W - padR} y1={y(1.5)} y2={y(1.5)}
                stroke="#E8763A" strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
          <text x={W - padR} y={y(1.5) - 5} textAnchor="end"
                fontSize="10" fill="#E8763A">1.5 watch</text>

          {/* axis */}
          <line x1={padL} x2={padL} y1={padT} y2={padT + plotH}
                stroke="#E2E8E8" strokeWidth="1" />
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH}
                stroke="#E2E8E8" strokeWidth="1" />
          <text x={padL - 6} y={y(0) + 3} textAnchor="end" fontSize="10" fill="#94A3B3">0</text>
          <text x={padL - 6} y={y(maxV) + 8} textAnchor="end" fontSize="10" fill="#94A3B3">
            {maxV.toFixed(1)}
          </text>

          <path d={area} fill="url(#trendFill)" />
          <path d={line} fill="none" stroke="#0E7C86" strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(Number(p.max_asymmetry_c))} r="5"
                      fill={RISK_DOT[p.risk]} stroke="#fff" strokeWidth="2" />
              {(i === 0 || i === points.length - 1 || points.length <= 6) && (
                <text x={x(i)} y={padT + plotH + 16} textAnchor="middle"
                      fontSize="10" fill="#94A3B3">
                  {new Date(p.computed_at).toLocaleDateString(undefined, {
                    day: 'numeric', month: 'short',
                  })}
                </text>
              )}
            </g>
          ))}
        </svg>

        <p className="text-xs text-slate-400 mt-2">
          Largest temperature difference between matching points on the two feet, per scan.
        </p>
      </div>
    </div>
  )
}
