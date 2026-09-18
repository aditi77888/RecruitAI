import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Button } from '../components/kit/Button'
import { Input } from '../components/kit/Input'
import { Logo } from '../components/kit/Logo'
import { authApi, extractErrorMessage } from '../core/api'
import { useAuth } from '../core/auth'
import { useToast } from '../core/toast'

type UserType = 'company' | 'candidate'
type Mode = 'login' | 'signup'

export default function LoginPage() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [userType, setUserType] = useState<UserType>('company')
  const [mode, setMode] = useState<Mode>('login')

  if (session) {
    return <Navigate to={session.accountType === 'company' ? '/app' : '/portal'} replace />
  }

  function onAuthenticated(result: Parameters<typeof login>[0]) {
    login(result)
    toast.show(`Welcome, ${result.display_name.split(' ')[0]}.`, 'success')
    navigate(result.account_type === 'company' ? '/app' : '/portal', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="mb-8 text-center lg:hidden">
            <Logo className="mx-auto mb-3 h-10 w-10" />
            <h1 className="font-display text-2xl font-bold text-slate-900">RecruitAI</h1>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ['company', 'Company (HR)'],
                  ['candidate', 'Candidate'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setUserType(value)
                    setMode('login')
                  }}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    userType === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <h2 className="text-xl font-semibold text-slate-900">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            {mode === 'signup' && (
              <p className="mt-1 text-sm text-slate-500">
                {userType === 'company' ? "Set up your company's hiring workspace." : 'Sign up to apply to open roles.'}
              </p>
            )}

            <div className="mt-6">
              {userType === 'company' ? (
                mode === 'login' ? (
                  <CompanyLoginForm onSuccess={onAuthenticated} />
                ) : (
                  <CompanySignupForm onSuccess={onAuthenticated} />
                )
              ) : mode === 'login' ? (
                <CandidateLoginForm onSuccess={onAuthenticated} />
              ) : (
                <CandidateSignupForm onSuccess={onAuthenticated} />
              )}
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BrandPanel() {
  return (
    <div className="relative hidden w-[42%] shrink-0 overflow-hidden bg-ink-900 lg:flex lg:flex-col lg:p-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(60% 60% at 20% 15%, rgba(99,102,241,0.35), transparent), radial-gradient(50% 50% at 85% 80%, rgba(168,85,247,0.28), transparent)',
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <Logo className="h-24 w-24" />
        <h1 className="mt-6 font-display text-3xl font-semibold text-white">RecruitAI</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">Screen, Shortlist, Interview — Autonomously.</p>
      </div>

      <p className="relative text-center text-xs text-slate-500">&copy; {new Date().getFullYear()} RecruitAI</p>
    </div>
  )
}

// ---------------------------------------------------------------- Company

function CompanyLoginForm({ onSuccess }: { onSuccess: (r: Awaited<ReturnType<typeof authApi.companyLogin>>) => void }) {
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authApi.companyLogin({ company_name: companyName, password })
      onSuccess(result)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Company name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        Log in
      </Button>
    </form>
  )
}

function CompanySignupForm({ onSuccess }: { onSuccess: (r: Awaited<ReturnType<typeof authApi.companySignupVerify>>) => void }) {
  const toast = useToast()
  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [companyName, setCompanyName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pendingToken, setPendingToken] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startSignup(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authApi.companySignupStart({
        company_name: companyName,
        company_email: companyEmail,
        password,
      })
      setPendingToken(result.pending_token)
      setStep('verify')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authApi.companySignupVerify({ pending_token: pendingToken, code })
      onSuccess(result)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    try {
      await authApi.companySignupResend(pendingToken)
      toast.show('A new verification code has been sent.', 'info')
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  if (step === 'verify') {
    return (
      <form onSubmit={verify} className="space-y-4">
        <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
          We&apos;ve sent a 6-digit code to <span className="font-semibold">{companyEmail}</span>.
        </p>
        <Input
          label="Verification code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          inputMode="numeric"
        />
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Verify &amp; create account
        </Button>
        <div className="flex justify-between text-sm">
          <button type="button" onClick={() => setStep('details')} className="text-slate-500 hover:text-slate-700">
            Back
          </button>
          <button type="button" onClick={resend} className="font-medium text-brand-600 hover:text-brand-700">
            Resend code
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={startSignup} className="space-y-4">
      <Input label="Company name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      <Input
        label="Company email"
        type="email"
        required
        hint="We'll send a verification code here."
        value={companyEmail}
        onChange={(e) => setCompanyEmail(e.target.value)}
      />
      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        Send verification code
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------- Candidate

function CandidateLoginForm({ onSuccess }: { onSuccess: (r: Awaited<ReturnType<typeof authApi.candidateLogin>>) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authApi.candidateLogin({ email, password })
      onSuccess(result)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        Log in
      </Button>
    </form>
  )
}

function CandidateSignupForm({ onSuccess }: { onSuccess: (r: Awaited<ReturnType<typeof authApi.candidateSignup>>) => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authApi.candidateSignup({ full_name: fullName, email, password })
      onSuccess(result)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        Create account
      </Button>
    </form>
  )
}
