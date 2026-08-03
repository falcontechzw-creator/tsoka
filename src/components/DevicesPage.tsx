import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/types'
import { Tablet, Wifi, WifiOff, Plus, Copy, Check, MapPin } from 'lucide-react'

type Device = {
  id: string
  label: string
  device_key: string
  clinic_id: string | null
  last_seen_at: string | null
  active: boolean
  created_at: string
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [clinics, setClinics] = useState<Record<string, string>>({})
  const [scanCounts, setScanCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [clinicId, setClinicId] = useState('')

  async function load() {
    setLoading(true)
    const [d, c, s] = await Promise.all([
      supabase.from('devices').select('*').order('label'),
      supabase.from('clinics').select('id, name').order('name'),
      supabase.from('scans').select('device_id'),
    ])
    if (d.error) setError(d.error.message)
    setDevices((d.data ?? []) as Device[])
    setClinics(Object.fromEntries((c.data ?? []).map((x: any) => [x.id, x.name])))
    if ((c.data ?? []).length) setClinicId((v) => v || (c.data as any)[0].id)

    const counts: Record<string, number> = {}
    ;(s.data ?? []).forEach((x: any) => {
      if (x.device_id) counts[x.device_id] = (counts[x.device_id] ?? 0) + 1
    })
    setScanCounts(counts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addDevice() {
    if (!label.trim() || !key.trim()) { setError('Label and key are both required.'); return }
    const { error } = await supabase.from('devices').insert({
      label: label.trim(),
      device_key: key.trim(),
      clinic_id: clinicId || null,
      active: true,
    })
    if (error) { setError(error.message); return }
    setLabel(''); setKey(''); setAdding(false); setError('')
    load()
  }

  async function toggleActive(d: Device) {
    await supabase.from('devices').update({ active: !d.active }).eq('id', d.id)
    load()
  }

  function copyKey(k: string) {
    navigator.clipboard?.writeText(k)
    setCopied(k)
    setTimeout(() => setCopied(null), 1500)
  }

  /** A mat counts as online if it reported in the last day. */
  function isOnline(d: Device) {
    if (!d.active || !d.last_seen_at) return false
    return Date.now() - new Date(d.last_seen_at).getTime() < 86400000
  }

  const online = devices.filter(isOnline).length

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Devices</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Registered screening mats. {online} of {devices.length} reported in the last day.
          </p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tsoka-deep
                     text-white text-sm font-semibold shadow-sm hover:bg-tsoka-teal transition"
        >
          <Plus size={16} />
          {adding ? 'Cancel' : 'Register mat'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3
                        text-sm text-rose-700">{error}</div>
      )}

      {adding && (
        <div className="mb-5 rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Register a new mat</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-500 mb-1.5">Label</span>
              <input
                value={label} onChange={(e) => setLabel(e.target.value)}
                placeholder="Mat 004 - Glen View"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                           outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-500 mb-1.5">
                Device key
              </span>
              <input
                value={key} onChange={(e) => setKey(e.target.value)}
                placeholder="tsoka-key-004"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm
                           font-mono outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-500 mb-1.5">Clinic</span>
              <select
                value={clinicId} onChange={(e) => setClinicId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white
                           text-sm outline-none focus:ring-2 focus:ring-tsoka-mid/40 transition"
              >
                {Object.entries(clinics).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            The device key is what the mat sends to identify itself. Keep it secret.
          </p>
          <button
            onClick={addDevice}
            className="mt-3 px-4 py-2.5 rounded-xl bg-tsoka-warm text-white text-sm
                       font-semibold hover:opacity-90 transition"
          >
            Register mat
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading devices…</p>}

      {!loading && devices.length === 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm
                        px-6 py-14 text-center">
          <Tablet size={26} className="mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No mats registered</p>
          <p className="text-sm text-slate-500 mt-1">
            Register your first screening mat to begin.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {devices.map((d) => {
          const on = isOnline(d)
          return (
            <div key={d.id}
                 className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl grid place-items-center
                  ${on ? 'bg-emerald-50' : d.active ? 'bg-slate-100' : 'bg-slate-100'}`}>
                  {on
                    ? <Wifi size={18} className="text-emerald-600" />
                    : <WifiOff size={18} className="text-slate-400" />}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1
                  ${!d.active
                    ? 'bg-slate-100 text-slate-500 ring-slate-200'
                    : on
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                  {!d.active ? 'Disabled' : on ? 'Online' : 'Not reporting'}
                </span>
              </div>

              <p className="font-semibold text-slate-900">{d.label}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin size={11} />
                {d.clinic_id ? clinics[d.clinic_id] ?? 'Unknown clinic' : 'No clinic assigned'}
              </p>

              <dl className="mt-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Last reported</dt>
                  <dd className="text-slate-900 font-medium">
                    {d.last_seen_at ? formatDate(d.last_seen_at) : 'Never'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Scans taken</dt>
                  <dd className="text-slate-900 font-medium">{scanCounts[d.id] ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Registered</dt>
                  <dd className="text-slate-900 font-medium">{formatDate(d.created_at)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => copyKey(d.device_key)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                             rounded-lg border border-slate-200 text-xs font-medium
                             text-slate-600 hover:bg-slate-50 transition"
                >
                  {copied === d.device_key
                    ? <><Check size={13} className="text-emerald-600" /> Copied</>
                    : <><Copy size={13} /> Copy key</>}
                </button>
                <button
                  onClick={() => toggleActive(d)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs
                             font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  {d.active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
