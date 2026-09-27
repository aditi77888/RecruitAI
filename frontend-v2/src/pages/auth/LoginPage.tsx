import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { Button } from '../../components/kit/Button'
import { Input } from '../../components/kit/Input'
import { Logo, Wordmark } from '../../components/kit/Logo'
import { authApi } from '../../core/api/auth'
import { useAuth } from '../../core/auth-context'
import { extractErrorMessage } from '../../core/api-client'
import { useToast } from '../../core/toast-context'
import { cn } from '../../core/cn'

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
    <div className="flex min-h-screen bg-bg">
      <BrandPanel />

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] animate-rise-in">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <Logo className="h-7 w-7" />
            <Wordmark className="text-[17px]" />
          </div>

          <div className="mb-6 flex rounded-md border border-border bg-surface p-0.5">
            {(
              [
                ['company', 'Company'],
                ['candidate', 'Candidate'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setUserType(value)
                  setMode('login')
                }}
                className={cn(
                  'flex-1 rounded-[5px] py-1.5 text-[12.5px] font-semibold transition-colors',
                  userType === value ? 'bg-text text-white' : 'text-text-secondary hover:text-text',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <h1 className="font-display text-[19px] font-semibold text-text">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            {mode === 'signup'
              ? userType === 'company'
                ? "Set up your company's hiring workspace."
                : 'Sign up to apply to open roles.'
              : userType === 'company'
                ? 'Screen and interview candidates, faster.'
                : 'Track your applications in one place.'}
          </p>

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

          <p className="mt-6 text-center text-[13px] text-text-secondary">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="font-semibold text-accent hover:text-accent-hover"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function BrandPanel() {
  return (
    <div className="relative hidden w-[38%] shrink-0 overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative flex items-center gap-2">
        <Logo className="h-6 w-6" />
        <span className="font-display text-[15px] font-semibold tracking-tight text-white">RecruitAI</span>
      </div>

      <div className="relative">
        <p className="font-display max-w-xs text-[26px] font-semibold leading-[1.25] tracking-tight text-white">
          Screening, interviews, and decisions — in one operating system.
        </p>
        <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-slate-400">
          AI-assisted resume screening and interviews, with every decision left to your team.
        </p>
      </div>

      <p className="relative text-[12px] text-slate-500">&copy; {new Date().getFullYear()} RecruitAI</p>
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
    <form onSubmit={onSubmit} className="space-y-3.5">
      <Input label="Company name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-[12.5px] font-medium text-danger">{error}</p>}
      <Button type="submit" loading={loading} size="lg" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
        Continue
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
      <form onSubmit={verify} className="space-y-3.5">
        <p className="rounded-md bg-accent-soft px-3 py-2.5 text-[12.5px] text-accent">
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
        {error && <p className="text-[12.5px] font-medium text-danger">{error}</p>}
        <Button type="submit" loading={loading} size="lg" className="w-full">
          Verify &amp; create account
        </Button>
        <div className="flex justify-between text-[12.5px]">
          <button type="button" onClick={() => setStep('details')} className="text-text-secondary hover:text-text">
            Back
          </button>
          <button type="button" onClick={resend} className="font-semibold text-accent hover:text-accent-hover">
            Resend code
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={startSignup} className="space-y-3.5">
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
      {error && <p className="text-[12.5px] font-medium text-danger">{error}</p>}
      <Button type="submit" loading={loading} size="lg" className="w-full">
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
    <form onSubmit={onSubmit} className="space-y-3.5">
      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-[12.5px] font-medium text-danger">{error}</p>}
      <Button type="submit" loading={loading} size="lg" className="w-full">
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
    <form onSubmit={onSubmit} className="space-y-3.5">
      <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-[12.5px] font-medium text-danger">{error}</p>}
      <Button type="submit" loading={loading} size="lg" className="w-full">
        Create account
      </Button>
    </form>
  )
}
