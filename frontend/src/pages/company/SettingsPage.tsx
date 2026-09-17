import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/kit/Button'
import { Card, CardHeader } from '../../components/kit/Card'
import { Input } from '../../components/kit/Input'
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
    <div className="max-w-2xl animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      <Card>
        <CardHeader title="Account" />
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Company</dt>
            <dd className="font-medium text-slate-900">{settings.company_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Company ID</dt>
            <dd className="font-mono text-xs text-slate-600">{settings.company_id}</dd>
          </div>
        </dl>
      </Card>

      <ContactEmailCard settings={settings} onUpdated={refresh} />
      <ThresholdCard settings={settings} onUpdated={refresh} />
      <ChangePasswordCard />
      <ExportCard companyId={settings.company_id} />

      <div className="pt-2">
        <Button
          variant="danger"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        >
          Log out
        </Button>
      </div>
    </div>
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
    <Card>
      <CardHeader
        title="Contact email"
        subtitle="Shown as the Reply-To address on interview and shortlist emails sent to candidates."
      />
      <form onSubmit={onSubmit} className="flex items-end gap-3">
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
    <Card>
      <CardHeader
        title="Shortlisting threshold"
        subtitle="Candidates scoring above this get shortlisted; everyone else is rejected. Applies to every job opening you post."
      />
      <div className="flex items-center gap-4">
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
      <CardHeader title="Change password" />
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
    <Card>
      <CardHeader title="Export candidates" subtitle="Download every candidate across all your job openings as a CSV." />
      <Button variant="secondary" loading={loading} onClick={download}>
        Download CSV
      </Button>
    </Card>
  )
}
