import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { TriangleAlert, Loader2 } from 'lucide-react'

/**
 * Lets a person delete their own login.
 * Clinical records are deliberately kept, because a clinic must not lose a
 * patient history. Only the account and the link to it are removed.
 */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    if (confirm.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm.')
      return
    }
    setBusy(true); setError('')
    const { error } = await supabase.rpc('delete_my_account')
    if (error) { setError(error.message); setBusy(false); return }
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <section className="rounded-2xl bg-white border border-rose-200 shadow-sm p-5 mt-5">
      <div className="flex items-center gap-2 mb-1">
        <TriangleAlert size={17} className="text-rose-500" />
        <h2 className="font-semibold text-slate-900">Delete my account</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4 leading-relaxed">
        This removes your login permanently. Your clinical records stay with your clinic,
        as they must, but your access to them ends and you will need to sign up again to
        use the app.
      </p>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200 rounded-xl
                      px-3.5 py-2.5 mb-3">{error}</p>
      )}

      {open ? (
        <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 p-4">
          <p className="text-sm text-rose-900 font-medium mb-3">
            This cannot be undone. Type <span className="font-bold">DELETE</span> to confirm.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="flex-1 min-w-[160px] px-3.5 py-2.5 rounded-xl border
                         border-rose-200 bg-white text-sm outline-none
                         focus:ring-2 focus:ring-rose-300 transition"
            />
            <button
              onClick={remove} disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600
                         text-white text-sm font-semibold hover:bg-rose-700
                         disabled:opacity-50 transition"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirm(''); setError('') }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                         text-slate-600 bg-white hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 rounded-xl border border-rose-200 text-sm font-semibold
                     text-rose-600 hover:bg-rose-50 transition"
        >
          Delete my account
        </button>
      )}
    </section>
  )
}
