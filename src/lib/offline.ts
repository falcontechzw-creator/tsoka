import { supabase } from './supabase'

/**
 * A small offline write queue.
 *
 * When the network drops, writes are parked in localStorage instead of being
 * lost, then replayed in order once the browser reports it is back online.
 * Reads still need a connection, but a nurse can keep capturing during a
 * dropout, which is the case that actually matters in a clinic with weak signal.
 */

const KEY = 'tsoka:pending'

export type PendingKind = 'vitals' | 'scan' | 'note' | 'medication_log'

export type Pending = {
  id: string
  kind: PendingKind
  payload: any
  created_at: string
}

export type QueueState = {
  online: boolean
  pending: number
  syncing: boolean
}

type Listener = (state: QueueState) => void

let listeners: Listener[] = []
let syncing = false

function read(): Pending[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function write(items: Pending[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
  emit()
}

function emit() {
  const state = getState()
  listeners.forEach((l) => l(state))
}

export function getState(): QueueState {
  return { online: navigator.onLine, pending: read().length, syncing }
}

export function subscribe(l: Listener) {
  listeners.push(l)
  l(getState())
  return () => { listeners = listeners.filter((x) => x !== l) }
}

/** Park a write for later. */
export function enqueue(kind: PendingKind, payload: any) {
  const items = read()
  items.push({
    id: crypto.randomUUID(),
    kind,
    payload,
    created_at: new Date().toISOString(),
  })
  write(items)
}

/** Send one parked write. Returns true if it went through. */
async function send(item: Pending): Promise<boolean> {
  try {
    if (item.kind === 'vitals') {
      const { error } = await supabase.from('vitals').insert(item.payload)
      return !error
    }

    if (item.kind === 'note') {
      const { error } = await supabase.from('clinical_notes').insert(item.payload)
      return !error
    }

    if (item.kind === 'medication_log') {
      const { error } = await supabase.from('medication_logs').insert(item.payload)
      return !error
    }

    if (item.kind === 'scan') {
      // payload: { patient_id, readings: [{ foot, position, temperature_c }] }
      const { data: scan, error: e1 } = await supabase
        .from('scans')
        .insert({
          patient_id: item.payload.patient_id,
          scanned_at: item.created_at,
          synced_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (e1 || !scan) return false

      const rows = item.payload.readings.map((r: any) => ({ ...r, scan_id: scan.id }))
      const { error: e2 } = await supabase.from('scan_readings').insert(rows)
      if (e2) return false

      const { error: e3 } = await supabase.rpc('compute_scan_risk', { p_scan_id: scan.id })
      return !e3
    }

    return false
  } catch {
    return false
  }
}

/** Try to clear the queue. Safe to call often. */
export async function flush(): Promise<void> {
  if (syncing || !navigator.onLine) return
  const items = read()
  if (items.length === 0) return

  syncing = true
  emit()

  const remaining: Pending[] = []
  for (const item of items) {
    const ok = await send(item)
    if (!ok) remaining.push(item)
  }

  syncing = false
  write(remaining)
}

/** Start watching for the network coming back. Call once at app start. */
export function startQueue() {
  window.addEventListener('online', () => { emit(); flush() })
  window.addEventListener('offline', emit)
  if (navigator.onLine) flush()
  // Retry periodically, since 'online' can fire before the link really works.
  setInterval(() => { if (navigator.onLine) flush() }, 30000)
}

/**
 * Write now if possible, otherwise park it.
 * Returns 'sent' or 'queued' so the UI can say what happened.
 */
export async function writeOrQueue(
  kind: PendingKind,
  payload: any,
  direct: () => Promise<{ error: any }>,
): Promise<'sent' | 'queued'> {
  if (!navigator.onLine) {
    enqueue(kind, payload)
    return 'queued'
  }
  const { error } = await direct()
  if (error) {
    enqueue(kind, payload)
    return 'queued'
  }
  return 'sent'
}