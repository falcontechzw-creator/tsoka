import { useState } from 'react'
import {
  Users, LayoutDashboard, Bell, FileText, Tablet, Settings,
  LogOut, Menu, X, Footprints,
} from 'lucide-react'

export type NavKey = 'patients' | 'overview' | 'alerts' | 'reports' | 'devices' | 'settings'

type Props = {
  active: NavKey
  onNavigate: (k: NavKey) => void
  userEmail: string
  clinicName?: string | null
  alertCount?: number
  onSignOut: () => void
  children: React.ReactNode
}

const PRIMARY: { key: NavKey; label: string; icon: typeof Users }[] = [
  { key: 'patients', label: 'Patients', icon: Users },
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
]

const TOOLS: { key: NavKey; label: string; icon: typeof Users }[] = [
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'devices', label: 'Devices', icon: Tablet },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export default function AppShell({
  active, onNavigate, userEmail, clinicName, alertCount = 0, onSignOut, children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const name = userEmail.split('@')[0]

  const NavButton = ({ item }: { item: { key: NavKey; label: string; icon: typeof Users } }) => {
    const Icon = item.icon
    const on = active === item.key
    return (
      <button
        onClick={() => { onNavigate(item.key); setMobileOpen(false) }}
        aria-current={on ? 'page' : undefined}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium
                    transition-colors focus:outline-none focus-visible:ring-2
                    focus-visible:ring-tsoka-warm focus-visible:ring-offset-2
                    focus-visible:ring-offset-tsoka-deep
          ${on
            ? 'bg-white/12 text-white'
            : 'text-white/55 hover:text-white hover:bg-white/6'}`}
      >
        <Icon size={18} strokeWidth={2} className="shrink-0" />
        <span className="truncate">{item.label}</span>
        {item.key === 'alerts' && alertCount > 0 && (
          <span className="ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-full
                           bg-rose-500 text-white">
            {alertCount}
          </span>
        )}
      </button>
    )
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-tsoka-deep">
      <div className="px-5 pt-6 pb-7">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-tsoka-mid/25 grid place-items-center">
            <Footprints size={19} className="text-tsoka-warm" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <p className="text-white font-bold text-lg tracking-tight">Tsoka</p>
            <p className="text-white/40 text-[11px]">Diabetic foot screening</p>
          </div>
        </div>
      </div>

      <nav className="px-3 space-y-1">
        {PRIMARY.map((i) => <NavButton key={i.key} item={i} />)}
      </nav>

      <p className="px-5 mt-7 mb-2 text-[11px] font-semibold tracking-widest text-white/30">
        TOOLS
      </p>
      <nav className="px-3 space-y-1">
        {TOOLS.map((i) => <NavButton key={i.key} item={i} />)}
      </nav>

      <div className="mt-auto p-3">
        <div className="rounded-xl bg-white/6 px-3.5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-tsoka-mid/40 grid place-items-center
                          text-white text-sm font-semibold shrink-0">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate capitalize">{name}</p>
            <p className="text-white/40 text-xs truncate">
              {clinicName ?? 'Clinic staff'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30">
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 h-full">{sidebar}</div>
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="flex-1 bg-slate-900/40 backdrop-blur-sm"
          />
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 bg-white/85 backdrop-blur
                           border-b border-slate-200/80">
          <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <p className="text-sm text-slate-600">
              Welcome back,{' '}
              <span className="font-semibold text-slate-900 capitalize">{name}</span>
            </p>

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => onNavigate('alerts')}
                aria-label={`Alerts, ${alertCount} open`}
                className="relative p-2.5 rounded-lg text-slate-500 hover:text-slate-900
                           hover:bg-slate-100 transition-colors"
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
                onClick={onSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                           text-slate-600 hover:text-slate-900 hover:bg-slate-100
                           transition-colors"
              >
                <LogOut size={17} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 py-6 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  )
}
