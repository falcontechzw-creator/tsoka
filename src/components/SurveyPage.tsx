import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { SEGMENTS, SEGMENT_LIST } from '../lib/surveyQuestions'
import type { Question } from '../lib/surveyQuestions'
import {
  Footprints, Check, Loader2, ShieldCheck, ArrowLeft, Users,
} from 'lucide-react'

export default function SurveyPage() {
  const params = new URLSearchParams(window.location.search)
  const initial = params.get('for') ?? ''
  const [segKey, setSegKey] = useState(
    SEGMENTS[initial] ? initial : '',
  )
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [interviewer, setInterviewer] = useState('')
  const [respondent, setRespondent] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const seg = segKey ? SEGMENTS[segKey] : null

  function set(id: string, value: any) {
    setAnswers((a) => ({ ...a, [id]: value }))
  }

  function toggleMulti(id: string, option: string) {
    const cur: string[] = answers[id] ?? []
    set(id, cur.includes(option) ? cur.filter((x) => x !== option) : [...cur, option])
  }

  async function submit() {
    if (!seg) return
    const missing = seg.questions.filter(
      (q) => !q.optional && (answers[q.id] === undefined || answers[q.id] === ''
             || (Array.isArray(answers[q.id]) && answers[q.id].length === 0)),
    )
    if (missing.length > 0) {
      setError(`Please answer: ${missing.slice(0, 3).map((q) => q.text.slice(0, 40) + '…').join(' / ')}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setBusy(true); setError('')
    const { error } = await supabase.from('survey_responses').insert({
      segment: seg.key,
      answers,
      interviewer: interviewer.trim() || null,
      respondent: respondent.trim() || null,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setDone(true)
    window.scrollTo({ top: 0 })
  }

  function reset() {
    setAnswers({}); setRespondent(''); setDone(false); setError('')
  }

  /* ------------------------------ thank you ------------------------------ */
  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200
                        shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 grid place-items-center
                          mx-auto mb-4">
            <Check size={26} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Thank you</h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Your answers have been recorded. They will help us build something that
            actually works for people living with diabetes in Zimbabwe.
          </p>
          <button
            onClick={reset}
            className="mt-6 px-5 py-2.5 rounded-xl bg-tsoka-deep text-white text-sm
                       font-semibold hover:bg-tsoka-teal transition"
          >
            Record another response
          </button>
        </div>
      </div>
    )
  }

  /* --------------------------- pick an audience --------------------------- */
  if (!seg) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-lg mx-auto pt-10">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-tsoka-deep grid place-items-center">
              <Footprints size={21} className="text-tsoka-warm" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                Tsoka
              </p>
              <p className="text-xs text-slate-500 mt-1">Research questionnaire</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Which best describes you?
          </h1>
          <p className="text-slate-500 text-sm mt-1 mb-6">
            Choose the one closest to your situation.
          </p>

          <div className="space-y-2.5">
            {SEGMENT_LIST.map((sg) => (
              <button
                key={sg.key}
                onClick={() => setSegKey(sg.key)}
                className="w-full text-left rounded-2xl bg-white border border-slate-200
                           shadow-sm p-4 hover:border-tsoka-mid transition flex gap-3"
              >
                <Users size={18} className="text-tsoka-teal shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{sg.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{sg.audience}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------- the form ------------------------------- */
  const before = seg.questions.filter((q) => !q.afterPitch)
  const after = seg.questions.filter((q) => q.afterPitch)

  const renderQ = (q: Question, index: number) => (
    <div key={q.id} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <p className="font-semibold text-slate-900 text-[15px] leading-snug">
        <span className="text-tsoka-teal">{index}.</span> {q.text}
        {q.optional && <span className="text-slate-400 font-normal text-sm"> (optional)</span>}
      </p>

      <div className="mt-3.5">
        {q.type === 'single' && (
          <div className="space-y-1.5">
            {q.options!.map((o) => (
              <label key={o}
                     className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border
                                 cursor-pointer transition
                       ${answers[q.id] === o
                         ? 'border-tsoka-teal bg-tsoka-mid/5'
                         : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name={q.id} value={o}
                       checked={answers[q.id] === o}
                       onChange={() => set(q.id, o)}
                       className="w-4 h-4 accent-tsoka-teal" />
                <span className="text-sm text-slate-800">{o}</span>
              </label>
            ))}
          </div>
        )}

        {q.type === 'multi' && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 mb-1.5">Choose all that apply</p>
            {q.options!.map((o) => {
              const on = (answers[q.id] ?? []).includes(o)
              return (
                <label key={o}
                       className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border
                                   cursor-pointer transition
                         ${on ? 'border-tsoka-teal bg-tsoka-mid/5'
                              : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={on}
                         onChange={() => toggleMulti(q.id, o)}
                         className="w-4 h-4 rounded accent-tsoka-teal" />
                  <span className="text-sm text-slate-800">{o}</span>
                </label>
              )
            })}
          </div>
        )}

        {q.type === 'scale' && (
          <div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => set(q.id, n)}
                        className={`flex-1 py-3 rounded-xl border font-semibold transition
                          ${answers[q.id] === n
                            ? 'border-tsoka-teal bg-tsoka-deep text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-slate-400">
              <span>{q.scaleLow}</span><span>{q.scaleHigh}</span>
            </div>
          </div>
        )}

        {q.type === 'short' && (
          <input
            value={answers[q.id] ?? ''} onChange={(e) => set(q.id, e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                       outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
          />
        )}

        {q.type === 'text' && (
          <textarea
            rows={3} value={answers[q.id] ?? ''} onChange={(e) => set(q.id, e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                       resize-y outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
          />
        )}

        {q.followUp && (
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-1.5">{q.followUp}</p>
            <textarea
              rows={2} value={answers[`${q.id}_note`] ?? ''}
              onChange={(e) => set(`${q.id}_note`, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                         resize-y outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
            />
          </div>
        )}
      </div>
    </div>
  )

  let n = 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-tsoka-deep">
        <div className="max-w-2xl mx-auto px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center">
              <Footprints size={19} className="text-tsoka-warm" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-white font-bold tracking-tight leading-none">Tsoka</p>
              <p className="text-white/50 text-xs mt-1">{seg.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6">
        <button
          onClick={() => { setSegKey(''); setAnswers({}) }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900
                     mb-4 transition"
        >
          <ArrowLeft size={15} /> Change audience
        </button>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 mb-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-tsoka-teal shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">{seg.intro}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <input
              value={interviewer} onChange={(e) => setInterviewer(e.target.value)}
              placeholder="Interviewer name (optional)"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                         outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
            />
            <input
              value={respondent} onChange={(e) => setRespondent(e.target.value)}
              placeholder="Your initials (optional)"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                         outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3
                          text-sm text-rose-700">{error}</div>
        )}

        <div className="space-y-3">
          {before.map((q) => renderQ(q, ++n))}
        </div>

        {after.length > 0 && (
          <>
            <div className="my-6 rounded-2xl bg-tsoka-deep p-5">
              <p className="text-white font-semibold mb-2">About Tsoka</p>
              <p className="text-white/70 text-sm leading-relaxed">
                Tsoka is a low-cost mat you stand on for about twenty seconds. It compares
                the temperature at matching points on both feet. A spot that stays warmer
                than its match can be an early sign of a foot problem developing, often
                days before anything can be seen or felt. It is a warning to get checked,
                not a diagnosis.
              </p>
              <p className="text-white/50 text-xs mt-3">
                The remaining questions are about this idea.
              </p>
            </div>
            <div className="space-y-3">
              {after.map((q) => renderQ(q, ++n))}
            </div>
          </>
        )}

        <button
          onClick={submit} disabled={busy}
          className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-xl
                     bg-tsoka-deep text-white font-semibold hover:bg-tsoka-teal
                     disabled:opacity-50 transition"
        >
          {busy && <Loader2 size={17} className="animate-spin" />}
          {busy ? 'Submitting…' : 'Submit answers'}
        </button>

        <p className="text-xs text-slate-400 text-center mt-4 mb-8">
          Chengetai Health · Cimas Healthathon 3.0
        </p>
      </main>
    </div>
  )
}
