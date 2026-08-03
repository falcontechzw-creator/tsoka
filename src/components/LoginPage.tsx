import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Mail, Lock, Eye, EyeOff, ShieldCheck, Footprints, UserPlus,
  ArrowLeft, BadgeCheck, Loader2,
} from 'lucide-react'

type Mode = 'signin' | 'signup'

/** Decorative foot heat-map motif used in the hero panel. */
function HeatMapArt() {
  const points: [number, number, string, number][] = [
    // x, y, colour, radius
    [30, 12, '#F2A65A', 7],
    [32, 34, '#3FA7A7', 6],
    [50, 31, '#3FA7A7', 6],
    [70, 36, '#3FA7A7', 6],
    [52, 58, '#3FA7A7', 6],
    [50, 84, '#3FA7A7', 7],
  ]

  const Foot = ({ flip, hot }: { flip?: boolean; hot?: boolean }) => (
    <g transform={flip ? 'translate(150,0) scale(-1,1)' : undefined}>
      <path
        d="M75 8 C104 8,122 30,124 62 C126 92,118 112,116 134
           C114 158,122 176,120 204 C118 240,104 288,75 290
           C46 288,32 240,30 204 C28 176,36 158,34 134
           C32 112,24 92,26 62 C28 30,46 8,75 8 Z"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.5"
      />
      {points.map(([px, py, colour, r], i) => {
        const isHot = hot && i === 0
        return (
          <g key={i}>
            {isHot && (
              <circle cx={(px / 100) * 150} cy={(py / 100) * 300} r={r * 2.6}
                      fill="#F2A65A" opacity="0.18">
                <animate attributeName="r" values={`${r * 2}; ${r * 3.2}; ${r * 2}`}
                         dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.22; 0.06; 0.22"
                         dur="3s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={(px / 100) * 150} cy={(py / 100) * 300} r={r}
                    fill={isHot ? '#F2A65A' : colour}
                    opacity={isHot ? 0.95 : 0.55} />
          </g>
        )
      })}
    </g>
  )

  return (
    <svg viewBox="0 0 340 300" className="w-full max-w-xs" aria-hidden="true">
      <g transform="translate(0,0)"><Foot /></g>
      <g transform="translate(190,0)"><Foot flip hot /></g>
    </svg>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit() {
    setError(''); setNotice(''); setBusy(true)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      if (!fullName.trim()) { setError('Enter your full name.'); setBusy(false); return }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.'); setBusy(false); return
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim(), role: 'patient' } },
      })
      if (error) setError(error.message)
      else if (!data.session) {
        setNotice('Account created. Check your email to confirm, then sign in.')
        setMode('signin')
      }
    }
    setBusy(false)
  }

  async function resetPassword() {
    if (!email) { setError('Enter your email first, then select Forgot password.'); return }
    setError(''); setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setBusy(false)
    if (error) setError(error.message)
    else setNotice('If that address is registered, a reset link is on its way.')
  }

  const field = `w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white
                 text-sm text-slate-900 placeholder-slate-400 outline-none transition
                 focus:ring-2 focus:ring-tsoka-mid/40 focus:border-tsoka-mid`

  return (
    <div className="min-h-screen bg-slate-100 lg:p-6 grid place-items-center">
      <div className="w-full max-w-5xl bg-white lg:rounded-3xl lg:shadow-xl
                      overflow-hidden grid lg:grid-cols-2 min-h-screen lg:min-h-[640px]">

        {/* ---------------- hero ---------------- */}
        <section className="relative hidden lg:flex flex-col justify-between p-10
                            bg-gradient-to-br from-tsoka-deep via-tsoka-teal to-[#04363F]
                            overflow-hidden">
          {/* soft ambient shapes */}
          <div aria-hidden className="absolute -top-24 -right-24 w-80 h-80 rounded-full
                                      bg-tsoka-mid/20 blur-3xl" />
          <div aria-hidden className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full
                                      bg-tsoka-warm/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur
                              grid place-items-center ring-1 ring-white/15">
                <Footprints size={24} className="text-tsoka-warm" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-white text-2xl font-bold tracking-tight leading-none">
                  Tsoka
                </p>
                <p className="text-white/50 text-xs mt-1.5">
                  Diabetic Foot Screening Platform
                </p>
              </div>
            </div>

            <h1 className="mt-12 text-4xl font-bold text-white leading-tight tracking-tight">
              Better feet.<br />
              <span className="text-tsoka-mid">Better lives.</span>
            </h1>
            <p className="mt-4 text-white/60 text-sm leading-relaxed max-w-sm">
              Early detection of diabetic foot complications helps prevent ulcers,
              infections and amputations through continuous monitoring and timely
              intervention.
            </p>
          </div>

          <div className="relative flex justify-center py-6">
            <HeatMapArt />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3 rounded-2xl bg-white/8 backdrop-blur
                            ring-1 ring-white/10 px-4 py-3.5">
              <BadgeCheck size={20} className="text-tsoka-mid shrink-0" />
              <div>
                <p className="text-white text-sm font-semibold">Trusted by clinics</p>
                <p className="text-white/50 text-xs mt-0.5">Built for better outcomes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- auth card ---------------- */}
        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            {/* compact brand for small screens */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-tsoka-deep grid place-items-center">
                <Footprints size={21} className="text-tsoka-warm" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-slate-900 text-xl font-bold tracking-tight leading-none">
                  Tsoka
                </p>
                <p className="text-slate-500 text-xs mt-1">Diabetic Foot Screening</p>
              </div>
            </div>

            {mode === 'signup' && (
              <button
                onClick={() => { setMode('signin'); setError(''); setNotice('') }}
                className="flex items-center gap-1.5 text-sm text-slate-500
                           hover:text-slate-900 mb-4 transition"
              >
                <ArrowLeft size={15} /> Back to sign in
              </button>
            )}

            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-slate-500 text-sm mt-1 mb-7">
              {mode === 'signin'
                ? 'Sign in to access your account'
                : 'For patients monitoring their own foot health'}
            </p>

            <div className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="name"
                         className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <UserPlus size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="name" type="text" autoComplete="name"
                      value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tendai Moyo" className={field}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email"
                       className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email" type="email" autoComplete="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email" className={field}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password"
                       className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`${field} pr-11`}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg
                               text-slate-400 hover:text-slate-700 transition"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {mode === 'signin' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600
                                    cursor-pointer select-none">
                    <input
                      type="checkbox" checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded accent-tsoka-teal"
                    />
                    Remember me
                  </label>
                  <button
                    onClick={resetPassword}
                    className="text-sm font-medium text-tsoka-teal hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                onClick={submit} disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                           bg-tsoka-deep text-white font-semibold shadow-sm
                           hover:bg-tsoka-teal disabled:opacity-50 transition
                           focus:outline-none focus-visible:ring-2
                           focus-visible:ring-tsoka-mid focus-visible:ring-offset-2"
              >
                {busy && <Loader2 size={17} className="animate-spin" />}
                {busy
                  ? 'Please wait…'
                  : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>

              {error && (
                <p role="alert"
                   className="text-sm text-rose-700 bg-rose-50 ring-1 ring-rose-200
                              rounded-xl px-3.5 py-2.5">
                  {error}
                </p>
              )}
              {notice && (
                <p role="status"
                   className="text-sm text-teal-800 bg-teal-50 ring-1 ring-teal-200
                              rounded-xl px-3.5 py-2.5">
                  {notice}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 my-6">
              <span className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <span className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3.5">
              <ShieldCheck size={18} className="text-tsoka-teal shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Secure and confidential</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Your health data is protected and access is restricted to
                  authorised clinical staff.
                </p>
              </div>
            </div>

            {mode === 'signin' && (
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500 mb-3">Don't have an account?</p>
                <button
                  onClick={() => { setMode('signup'); setError(''); setNotice('') }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                             border border-slate-200 text-sm font-semibold text-tsoka-teal
                             hover:bg-slate-50 transition"
                >
                  <UserPlus size={16} />
                  Create patient account
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
