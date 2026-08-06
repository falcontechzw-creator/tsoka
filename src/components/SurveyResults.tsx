import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SEGMENTS, SEGMENT_LIST } from '../lib/surveyQuestions'
import { Copy, Check, Loader2, Download, Link as LinkIcon, Quote } from 'lucide-react'

type Response = {
  id: string
  segment: string
  answers: Record<string, any>
  interviewer: string | null
  respondent: string | null
  created_at: string
}

const card = 'rounded-2xl bg-white border border-slate-200 shadow-sm'

export default function SurveyResults() {
  const [rows, setRows] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('patients')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('survey_responses').select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRows((data ?? []) as Response[]); setLoading(false) })
  }, [])

  const base = window.location.origin
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    rows.forEach((r) => { c[r.segment] = (c[r.segment] ?? 0) + 1 })
    return c
  }, [rows])

  const seg = SEGMENTS[tab]
  const segRows = rows.filter((r) => r.segment === tab)

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  function exportCsv() {
    if (!seg) return
    const cols = seg.questions.map((q) => q.id)
    const header = ['date', 'interviewer', 'respondent', ...cols]
    const lines = [header.join(',')]
    segRows.forEach((r) => {
      const vals = [
        new Date(r.created_at).toLocaleDateString(),
        r.interviewer ?? '',
        r.respondent ?? '',
        ...cols.map((c) => {
          const v = r.answers[c]
          const t = Array.isArray(v) ? v.join('; ') : (v ?? '')
          return `"${String(t).replace(/"/g, '""')}"`
        }),
      ]
      lines.push(vals.join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `tsoka-${tab}-responses.csv`
    a.click()
  }

  /** Tally the answers for one question. */
  function tally(qid: string, options: string[]) {
    const out: Record<string, number> = {}
    options.forEach((o) => { out[o] = 0 })
    segRows.forEach((r) => {
      const v = r.answers[qid]
      if (Array.isArray(v)) v.forEach((x: string) => { if (x in out) out[x]++ })
      else if (typeof v === 'string' && v in out) out[v]++
    })
    return out
  }

  function scaleAverage(qid: string) {
    const vals = segRows.map((r) => r.answers[qid]).filter((v) => typeof v === 'number')
    if (vals.length === 0) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  const total = rows.length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Research</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Questionnaire responses, tallied automatically.
        </p>
      </div>

      {/* totals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <div className={`${card} p-4`}>
          <p className="text-3xl font-bold text-tsoka-teal leading-none">{total}</p>
          <p className="text-xs text-slate-500 mt-1.5">Total responses</p>
        </div>
        {SEGMENT_LIST.map((sg) => (
          <div key={sg.key} className={`${card} p-4`}>
            <p className="text-3xl font-bold text-slate-900 leading-none">
              {counts[sg.key] ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 leading-tight">{sg.title}</p>
          </div>
        ))}
      </div>

      {/* share links */}
      <section className={`${card} p-5 mb-5`}>
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon size={16} className="text-tsoka-teal" />
          <h2 className="font-semibold text-slate-900">Share the questionnaire</h2>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Send the right link to each group, or share the first one and let them choose.
        </p>
        <div className="space-y-2">
          {[{ key: '', title: 'Let them choose' }, ...SEGMENT_LIST].map((sg: any) => {
            const url = sg.key ? `${base}/survey?for=${sg.key}` : `${base}/survey`
            return (
              <div key={sg.key || 'all'}
                   className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <span className="text-sm text-slate-700 w-48 shrink-0 truncate">
                  {sg.title}
                </span>
                <code className="text-xs text-slate-500 truncate flex-1">{url}</code>
                <button
                  onClick={() => copy(url, sg.key || 'all')}
                  className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                             border border-slate-200 bg-white text-xs font-medium
                             text-slate-600 hover:border-tsoka-mid transition"
                >
                  {copied === (sg.key || 'all')
                    ? <><Check size={13} className="text-emerald-600" /> Copied</>
                    : <><Copy size={13} /> Copy</>}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* segment tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SEGMENT_LIST.map((sg) => (
          <button
            key={sg.key} onClick={() => setTab(sg.key)}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition
              ${tab === sg.key
                ? 'bg-tsoka-deep text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-tsoka-mid'}`}
          >
            {sg.title} ({counts[sg.key] ?? 0})
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </p>
      )}

      {!loading && segRows.length === 0 && (
        <div className={`${card} px-6 py-14 text-center`}>
          <p className="font-medium text-slate-700">No responses yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Share the link above to start collecting.
          </p>
        </div>
      )}

      {!loading && segRows.length > 0 && seg && (
        <>
          <div className="flex justify-end mb-3">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border
                         border-slate-200 bg-white text-sm font-medium text-slate-600
                         hover:border-tsoka-mid transition"
            >
              <Download size={15} /> Export CSV
            </button>
          </div>

          <div className="space-y-3">
            {seg.questions.map((q) => {
              if (q.type === 'text' || q.type === 'short') {
                const notes = segRows
                  .map((r) => r.answers[q.id])
                  .filter((v) => typeof v === 'string' && v.trim())
                if (notes.length === 0) return null
                return (
                  <div key={q.id} className={`${card} p-5`}>
                    <p className="font-semibold text-slate-900 text-sm mb-3">{q.text}</p>
                    <ul className="space-y-2">
                      {notes.slice(0, 8).map((t: string, i: number) => (
                        <li key={i} className="flex gap-2.5 text-sm text-slate-600">
                          <Quote size={13} className="text-slate-300 shrink-0 mt-1" />
                          <span className="leading-relaxed">{t}</span>
                        </li>
                      ))}
                    </ul>
                    {notes.length > 8 && (
                      <p className="text-xs text-slate-400 mt-2">
                        + {notes.length - 8} more, see the CSV export
                      </p>
                    )}
                  </div>
                )
              }

              if (q.type === 'scale') {
                const avg = scaleAverage(q.id)
                const dist = tally(q.id, ['1', '2', '3', '4', '5'])
                segRows.forEach((r) => {
                  const v = r.answers[q.id]
                  if (typeof v === 'number') dist[String(v)] = (dist[String(v)] ?? 0) + 1
                })
                const max = Math.max(1, ...Object.values(dist))
                return (
                  <div key={q.id} className={`${card} p-5`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="font-semibold text-slate-900 text-sm">{q.text}</p>
                      {avg && (
                        <span className="shrink-0 text-sm font-bold text-tsoka-teal">
                          avg {avg}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-2 h-20">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-slate-500">{dist[String(n)] ?? 0}</span>
                          <div className="w-full bg-tsoka-mid rounded-t"
                               style={{ height: `${((dist[String(n)] ?? 0) / max) * 56}px` }} />
                          <span className="text-xs text-slate-400">{n}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-slate-400">
                      <span>{q.scaleLow}</span><span>{q.scaleHigh}</span>
                    </div>
                  </div>
                )
              }

              const t = tally(q.id, q.options ?? [])
              const totalAns = Math.max(1, segRows.length)
              return (
                <div key={q.id} className={`${card} p-5`}>
                  <p className="font-semibold text-slate-900 text-sm mb-3">{q.text}</p>
                  <div className="space-y-2">
                    {(q.options ?? []).map((o) => {
                      const c = t[o] ?? 0
                      const pct = Math.round((c / totalAns) * 100)
                      return (
                        <div key={o}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700">{o}</span>
                            <span className="text-slate-500 font-medium">
                              {c} · {pct}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-tsoka-teal rounded-full"
                                 style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
