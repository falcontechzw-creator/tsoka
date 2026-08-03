import { useState } from 'react'
import {
  Home, Footprints, LineChart, CalendarDays, Pill, MessageSquare,
  CircleHelp, User, LogOut, Menu, X, Bell, Headset, ChevronDown,
} from 'lucide-react'
import { initials } from '../../lib/types'

export type PatientNav =
  | 'home' | 'foot' | 'readings' | 'appointments'
  | 'medication' | 'messages' | 'help' | 'profile'

const ITEMS: { key: PatientNav; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'foot', label: 'My foot health', icon: Footprints },
  { key: 'readings', label: 'My readings', icon: LineChart },
  { key: 'appointments', label: 'Appointments', icon: CalendarDays },
  { key: 'medication', label: 'Medication', icon: Pill },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'help', label: 'Help and support', icon: CircleHelp },
  { key: 'profile', label: 'Profile', icon: User },
]

type Props = {
  active: PatientNav
  onNavigate: (k: PatientNav) => void
  name: string
  alertCount?: number
  unreadCount?: number
  onSignOut: () => void
  children: React.ReactNode
}

export default function PatientShell({
  active, onNavigate, name, alertCount = 0, unreadCount = 0, onSignOut, children,
}: Props) {
  const [open, setOpen] = useState(false)
  const display = name || 'Patient'

  const sidebar = (
    <div className="flex flex-col h-full bg-tsoka-deep">
      <div className="px-5 pt-6 pb-7">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white/10 grid place-items-center
                          ring-1 ring-white/10">
            <Footprints size={20} className="text-tsoka-warm" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <p className="text-white font-bold text-xl tracking-tight">Tsoka</p>
            <p className="text-white/40 text-[11px] mt-0.5">
              Diabetic Foot Screening
            </p>
          </div>
        </div>
      </div>

      <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
        {ITEMS.map(({ key, label, icon: Icon }) => {
          const on = active === key
          return (
            <button
              key={key}
              onClick={() => { onNavigate(key); setOpen(false) }}
              aria-current={on ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm
                          font-medium transition-colors focus:outline-none
                          focus-visible:ring-2 focus-visible:ring-tsoka-warm
                          focus-visible:ring-offset-2 focus-visible:ring-offset-tsoka-deep
                ${on ? 'bg-white/12 text-white'
                     : 'text-white/55 hover:text-white hover:bg-white/6'}`}
            >
              <Icon size={18} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{label}</span>
              {key === 'messages' && unreadCount > 0 && (
                <span className="ml-auto text-[11px] font-semibold px-1.5 py-0.5
                                 rounded-full bg-tsoka-warm text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          )
        })}

        <div className="pt-2 mt-2 border-t border-white/10">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm
                       font-medium text-white/55 hover:text-white hover:bg-white/6
                       transition-colors"
          >
            <LogOut size={18} strokeWidth={2} />
            Log out
          </button>
        </div>
      </nav>

      <div className="p-3">
        <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Headset size={17} className="text-tsoka-mid" />
            <p className="text-white text-sm font-semibold">Need help?</p>
          </div>
          <p className="text-white/50 text-xs leading-relaxed mb-3">
            Contact your clinic or chat with a nurse.
          </p>
          <button
            onClick={() => { onNavigate('messages'); setOpen(false) }}
            className="w-full py-2 rounded-xl border border-white/20 text-white
                       text-xs font-semibold hover:bg-white/10 transition"
          >
            Contact clinic
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">{sidebar}</aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 h-full">{sidebar}</div>
          <button aria-label="Close menu" onClick={() => setOpen(false)}
                  className="flex-1 bg-slate-900/40 backdrop-blur-sm" />
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur
                           border-b border-slate-200/80">
          <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
            <button
              onClick={() => setOpen(true)} aria-label="Open menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => onNavigate('foot')}
                aria-label={`Alerts, ${alertCount} open`}
                className="relative p-2.5 rounded-lg text-slate-500 hover:text-slate-900
                           hover:bg-slate-100 transition"
              >
                <Bell size={19} />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1
                                   rounded-full bg-rose-500 text-white text-[10px]
                                   font-bold grid place-items-center">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl
                           hover:bg-slate-100 transition"
              >
                <span className="w-9 h-9 rounded-full bg-tsoka-mid/15 text-tsoka-teal
                                 grid place-items-center text-sm font-bold">
                  {initials(display)}
                </span>
                <span className="hidden sm:block text-sm font-medium text-slate-800
                                 capitalize">
                  {display}
                </span>
                <ChevronDown size={15} className="hidden sm:block text-slate-400" />
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 py-7 max-w-[1400px]">{children}</main>

        <footer className="px-6 py-6 text-center">
          <p className="text-xs text-slate-400">
            Tsoka · Screening and early warning only, not a medical diagnosis.
          </p>
        </footer>
      </div>
    </div>
  )
}
