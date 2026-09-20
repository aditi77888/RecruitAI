import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/kit/Button'
import { Card, CardHeader } from '../../components/kit/Card'
import { Input } from '../../components/kit/Input'
import { PageHeader } from '../../components/kit/PageHeader'
import { PageSpinner } from '../../components/kit/Spinner'
import { extractErrorMessage, settingsApi } from '../../core/api'
import { useAuth } from '../../core/auth'
import { useToast } from '../../core/toast'
import type { CompanySettings } from '../../core/types'

export default function SettingsPage() {
  const toast = useToast()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<CompanySettings | null>(null)

  async function refresh() {
    try {
      setSettings(await settingsApi.get())
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!settings) return <PageSpinner />

  return (
    <div className="max-w-3xl animate-fade-in-up space-y-6">
      <PageHeader title="Settings" description="Manage your company profile, shortlisting rules, and account." />

      <Card>
        <CardHeader icon={<BuildingIcon className="h-4.5 w-4.5" />} title="Account" />
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <dt className="text-slate-500">Company</dt>
            <dd className="font-medium text-slate-900">{settings.company_name}</dd>
          </div>
          <div className="flex justify-between pt-1">
            <dt className="text-slate-500">Company ID</dt>
            <dd className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{settings.company_id}</dd>
          </div>
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ContactEmailCard settings={settings} onUpdated={refresh} />
        <ThresholdCard settings={settings} onUpdated={refresh} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChangePasswordCard />
        <ExportCard companyId={settings.company_id} />
      </div>

      <Card className="!border-rose-200 !bg-rose-50/40">
        <CardHeader
          icon={<LogoutIcon className="h-4.5 w-4.5" />}
          iconTone="rose"
          title="Sign out"
          subtitle="End your current session on this device."
        />
        <Button
          variant="danger"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        >
          Log out
        </Button>
      </Card>
    </div>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" strokeLinecap="round" />
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SliderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h10M18 6h2M4 18h2M8 18h12M4 12h6M14 12h6" strokeLinecap="round" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4v11m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ContactEmailCard({ settings, onUpdated }: { settings: CompanySettings; onUpdated: () => void }) {
  const toast = useToast()
  const [email, setEmail] = useState(settings.email ?? '')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await settingsApi.update({ email })
      toast.show('Contact email updated.', 'success')
      onUpdated()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<MailIcon className="h-4.5 w-4.5" />}
        title="Contact email"
        subtitle="Shown as the Reply-To address on interview and shortlist emails sent to candidates."
      />
      <form onSubmit={onSubmit} className="mt-auto flex items-end gap-3">
        <div className="flex-1">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hr@yourcompany.com" />
        </div>
        <Button type="submit" loading={loading}>
          Save
        </Button>
      </form>
    </Card>
  )
}

function ThresholdCard({ settings, onUpdated }: { settings: CompanySettings; onUpdated: () => void }) {
  const toast = useToast()
  const [threshold, setThreshold] = useState(settings.shortlist_threshold ?? 50)
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    try {
      await settingsApi.update({ shortlist_threshold: threshold })
      toast.show(`Threshold updated to ${threshold}.`, 'success')
      onUpdated()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<SliderIcon className="h-4.5 w-4.5" />}
        title="Shortlisting threshold"
        subtitle="Candidates scoring above this get shortlisted; everyone else is rejected. Applies to every job opening you post."
      />
      <div className="mt-auto flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600"
        />
        <span className="w-10 text-right text-sm font-semibold text-slate-900">{threshold}</span>
        <Button size="sm" loading={loading} onClick={save}>
          Save
        </Button>
      </div>
    </Card>
  )
}

function ChangePasswordCard() {
  const toast = useToast()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!oldPassword || !newPassword) {
      toast.show('Fill in all fields.', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.show("New passwords don't match.", 'error')
      return
    }
    setLoading(true)
    try {
      await settingsApi.changePassword({ old_password: oldPassword, new_password: newPassword })
      toast.show('Password changed.', 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={<LockIcon className="h-4.5 w-4.5" />} title="Change password" />
      <form onSubmit={onSubmit} className="space-y-3">
        <Input
          label="Current password"
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <Input
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" loading={loading}>
          Change password
        </Button>
      </form>
    </Card>
  )
}

function ExportCard({ companyId }: { companyId: string }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      await settingsApi.exportCsv(`${companyId}_candidates.csv`)
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<DownloadIcon className="h-4.5 w-4.5" />}
        title="Export candidates"
        subtitle="Download every candidate across all your job openings as a CSV."
      />
      <Button variant="secondary" loading={loading} onClick={download} className="mt-auto">
        Download CSV
      </Button>
    </Card>
  )
}
