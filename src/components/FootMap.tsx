import type { FootPosition, FootSide, ScanReading } from '../lib/types'
import { POSITION_LABELS, asymmetryColor } from '../lib/types'

/** Where each sensor sits on the foot outline, as a fraction of the box. */
const POINTS: Record<FootPosition, { x: number; y: number }> = {
  hallux:  { x: 0.30, y: 0.11 },
  met1:    { x: 0.32, y: 0.34 },
  met3:    { x: 0.50, y: 0.32 },
  met5:    { x: 0.70, y: 0.36 },
  midfoot: { x: 0.52, y: 0.58 },
  heel:    { x: 0.50, y: 0.84 },
}

type Props = {
  readings: ScanReading[]
  /** position -> absolute temperature difference between the two feet */
  asymmetry: Record<string, number>
}

function Foot({
  side, readings, asymmetry,
}: { side: FootSide; readings: ScanReading[]; asymmetry: Record<string, number> }) {
  const W = 150
  const H = 300
  // Mirror the right foot so the pair looks anatomically correct.
  const flip = side === 'R'

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-32 sm:w-36" role="img"
           aria-label={`${side === 'L' ? 'Left' : 'Right'} foot sensor readings`}>
        <g transform={flip ? `translate(${W},0) scale(-1,1)` : undefined}>
          {/* foot outline */}
          <path
            d="M75 8
               C 104 8, 122 30, 124 62
               C 126 92, 118 112, 116 134
               C 114 158, 122 176, 120 204
               C 118 240, 104 288, 75 290
               C 46 288, 32 240, 30 204
               C 28 176, 36 158, 34 134
               C 32 112, 24 92, 26 62
               C 28 30, 46 8, 75 8 Z"
            fill="#F2F6F6" stroke="#C6D4D4" strokeWidth="2"
          />
          {(Object.keys(POINTS) as FootPosition[]).map((pos) => {
            const r = readings.find((x) => x.foot === side && x.position === pos)
            const diff = asymmetry[pos] ?? 0
            const p = POINTS[pos]
            const cx = p.x * W
            const cy = p.y * H
            const hasReading = !!r
            return (
              <g key={pos}>
                <circle
                  cx={cx} cy={cy} r={hasReading ? 13 : 8}
                  fill={hasReading ? asymmetryColor(diff) : '#DDE5E5'}
                  stroke="#fff" strokeWidth="2.5"
                />
                {hasReading && (
                  <text
                    x={cx} y={cy + 4}
                    textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff"
                    transform={flip ? `translate(${2 * cx},0) scale(-1,1)` : undefined}
                  >
                    {r!.temperature_c.toFixed(1)}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        {side === 'L' ? 'Left foot' : 'Right foot'}
      </p>
    </div>
  )
}

export default function FootMap({ readings, asymmetry }: Props) {
  const flagged = Object.entries(asymmetry)
    .filter(([, d]) => d >= 1.5)
    .sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="flex justify-center gap-6 sm:gap-10">
        <Foot side="L" readings={readings} asymmetry={asymmetry} />
        <Foot side="R" readings={readings} asymmetry={asymmetry} />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
        {[
          ['#0E7C86', 'Under 0.8'],
          ['#E0B44A', '0.8 to 1.5'],
          ['#E8763A', '1.5 to 2.2'],
          ['#C1432E', '2.2 and above'],
        ].map(([c, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: c }} />
            {label} °C difference
          </span>
        ))}
      </div>

      {flagged.length > 0 && (
        <div className="mt-5 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900 mb-1">Flagged points</p>
          <ul className="text-sm text-amber-800 space-y-0.5">
            {flagged.map(([pos, d]) => (
              <li key={pos}>
                {POSITION_LABELS[pos as FootPosition]} — {d.toFixed(1)} °C difference
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
