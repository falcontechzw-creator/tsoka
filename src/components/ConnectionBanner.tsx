import { useEffect, useState } from 'react'
import { subscribe, flush, getState } from '../lib/offline'
import type { QueueState } from '../lib/offline'
import { CloudOff, RefreshCw, CloudUpload } from 'lucide-react'

export default function ConnectionBanner() {
  const [s, setS] = useState<QueueState>(getState())

  useEffect(() => subscribe(setS), [])

  // Nothing worth saying when online and fully synced.
  if (s.online && s.pending === 0) return null

  if (!s.online) {
    return (
      <div role="status"
           className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800 text-white text-sm">
        <CloudOff size={16} className="shrink-0" />
        <span>
          You are offline. Screenings and readings are saved on this device and will
          upload when the connection returns.
        </span>
        {s.pending > 0 && (
          <span className="ml-auto shrink-0 text-xs font-semibold px-2 py-0.5
                           rounded-full bg-white/15">
            {s.pending} waiting
          </span>
        )}
      </div>
    )
  }

  return (
    <div role="status"
         className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500 text-white text-sm">
      {s.syncing
        ? <RefreshCw size={16} className="shrink-0 animate-spin" />
        : <CloudUpload size={16} className="shrink-0" />}
      <span>
        {s.syncing
          ? `Uploading ${s.pending} saved ${s.pending === 1 ? 'record' : 'records'}…`
          : `${s.pending} ${s.pending === 1 ? 'record is' : 'records are'} waiting to upload.`}
      </span>
      {!s.syncing && (
        <button
          onClick={() => flush()}
          className="ml-auto shrink-0 text-xs font-semibold px-3 py-1 rounded-lg
                     bg-white/20 hover:bg-white/30 transition"
        >
          Retry now
        </button>
      )}
    </div>
  )
}
