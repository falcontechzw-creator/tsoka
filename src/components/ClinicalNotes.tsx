import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { initials, avatarTint } from '../lib/types'
import { NotebookPen, Send } from 'lucide-react'

type Note = {
  id: string
  body: string
  author_name: string | null
  created_at: string
}

type Props = { patientId: string }

export default function ClinicalNotes({ patientId }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('clinical_notes')
      .select('id, body, author_name, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) setError(error.message)
    setNotes((data ?? []) as Note[])
  }

  useEffect(() => { load() }, [patientId])

  async function save() {
    const text = body.trim()
    if (!text) return
    setSaving(true); setError('')

    const { data: u } = await supabase.auth.getUser()
    const email = u.user?.email ?? ''
    const { data: prof } = await supabase
      .from('profiles').select('full_name').eq('id', u.user?.id ?? '').maybeSingle()

    const { error } = await supabase.from('clinical_notes').insert({
      patient_id: patientId,
      author_id: u.user?.id ?? null,
      author_name: prof?.full_name || email.split('@')[0] || 'Staff',
      body: text,
    })

    if (error) { setError(error.message); setSaving(false); return }
    setBody(''); setSaving(false); load()
  }

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <NotebookPen size={17} className="text-tsoka-teal" />
        <h3 className="font-semibold text-slate-900">Clinical notes</h3>
        {notes.length > 0 && (
          <span className="text-xs text-slate-400">{notes.length}</span>
        )}
      </div>

      <div className="mb-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Record an observation, action taken, or referral…"
          aria-label="New clinical note"
          className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm
                     text-slate-900 placeholder-slate-400 resize-y outline-none
                     focus:ring-2 focus:ring-tsoka-mid/40 focus:border-tsoka-mid transition"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-400">
            Notes are visible to clinic staff and are permanent.
          </p>
          <button
            onClick={save}
            disabled={saving || !body.trim()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-tsoka-deep
                       text-white text-sm font-semibold hover:bg-tsoka-teal
                       disabled:opacity-40 disabled:hover:bg-tsoka-deep transition"
          >
            <Send size={14} />
            {saving ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}

      {notes.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">No notes recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const who = n.author_name ?? 'Staff'
            return (
              <li key={n.id} className="flex gap-3">
                <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0
                                  text-[11px] font-bold ${avatarTint(who)}`}>
                  {initials(who)}
                </span>
                <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900 capitalize truncate">
                      {who}
                    </p>
                    <p className="text-[11px] text-slate-400 shrink-0">
                      {new Date(n.created_at).toLocaleString(undefined, {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">
                    {n.body}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
