import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Download, Lock, LogOut, Mail, SlidersHorizontal } from 'lucide-react'

import { Button } from '../../components/kit/Button'
import { Input } from '../../components/kit/Input'
import { PageHeader } from '../../components/kit/PageHeader'
import { Panel, PanelBody, PanelHeader } from '../../components/kit/Panel'
import { ErrorState } from '../../components/kit/EmptyState'
import { PageSpinner } from '../../components/kit/Spinner'
import { useAuth } from '../../core/auth-context'
import { extractErrorMessage } from '../../core/api-client'
import { useChangePassword, useSettings, useUpdateSettings } from '../../hooks/useSettings'
import { settingsApi } from '../../core/api/settings'
import { useToast } from '../../core/toast-context'

export default function SettingsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { data: settings, isLoading, isError, refetch } = useSettings()

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load settings"
        description="Something went wrong reaching the server. Check your connection and try again."
        onRetry={() => refetch()}
      />
    )
  }
  if (isLoading || !settings) return <PageSpinner />

  return (
    <div className="max-w-2xl animate-fade-in space-y-5">
      <PageHeader title="Settings" description="Company profile, screening rules, and account." />

      <Panel>
        <PanelHeader title="Account" />
        <PanelBody>
          <dl className="space-y-2.5 text-[12.5px]">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <dt className="flex items-center gap-1.5 text-text-tertiary">
                <Building2 className="h-3.5 w-3.5" /> Company
              </dt>
              <dd className="font-medium text-text">{settings.company_name}</dd>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <dt className="text-text-tertiary">Company ID</dt>
              <dd className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[11.5px] text-text-secondary">
                {settings.company_id}
              </dd>
            </div>
          </dl>
        </PanelBody>
      </Panel>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ContactEmailPanel email={settings.email} />
        <ThresholdPanel threshold={settings.shortlist_threshold ?? 50} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ChangePasswordPanel />
        <ExportPanel companyId={settings.company_id} />
      </div>

      <Panel className="border-danger/25 bg-danger-soft/30">
        <PanelHeader
          title="Sign out"
          subtitle="End your current session on this device."
        />
        <PanelBody>
          <Button
            variant="danger"
            size="sm"
            icon={<LogOut className="h-3.5 w-3.5" />}
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Log out
          </Button>
        </PanelBody>
      </Panel>
    </div>
  )
}

function ContactEmailPanel({ email }: { email: string | null }) {
  const toast = useToast()
  const update = useUpdateSettings()
  const [value, setValue] = useState(email ?? '')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await update.mutateAsync({ email: value })
      toast.show('Contact email updated.', 'success')
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Contact email"
        subtitle="Reply-To on interview and shortlist emails sent to candidates."
      />
      <PanelBody className="mt-auto">
        <form onSubmit={onSubmit} className="flex items-end gap-2.5">
          <div className="flex-1">
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="hr@yourcompany.com" />
          </div>
          <Button type="submit" size="md" loading={update.isPending} icon={<Mail className="h-3.5 w-3.5" />}>
            Save
          </Button>
        </form>
      </PanelBody>
    </Panel>
  )
}

function ThresholdPanel({ threshold }: { threshold: number }) {
  const toast = useToast()
  const update = useUpdateSettings()
  const [value, setValue] = useState(threshold)

  async function save() {
    try {
      await update.mutateAsync({ shortlist_threshold: value })
      toast.show(`Threshold updated to ${value}.`, 'success')
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Screening threshold"
        subtitle="Candidates scoring above this are shortlisted; applies to every job."
      />
      <PanelBody className="mt-auto">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-sunken accent-accent"
            aria-label="Screening threshold"
          />
          <span className="w-8 text-right text-[13px] font-semibold tabular-nums text-text">{value}</span>
          <Button size="sm" loading={update.isPending} onClick={save}>
            Save
          </Button>
        </div>
      </PanelBody>
    </Panel>
  )
}

function ChangePasswordPanel() {
  const toast = useToast()
  const changePassword = useChangePassword()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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
    try {
      await changePassword.mutateAsync({ old_password: oldPassword, new_password: newPassword })
      toast.show('Password changed.', 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  return (
    <Panel>
      <PanelHeader title="Change password" />
      <PanelBody>
        <form onSubmit={onSubmit} className="space-y-2.5">
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
          <Button type="submit" size="sm" loading={changePassword.isPending} icon={<Lock className="h-3.5 w-3.5" />}>
            Change password
          </Button>
        </form>
      </PanelBody>
    </Panel>
  )
}

function ExportPanel({ companyId }: { companyId: string }) {
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
    <Panel className="flex flex-col">
      <PanelHeader title="Export candidates" subtitle="Download every candidate across all jobs as a CSV." />
      <PanelBody className="mt-auto">
        <Button variant="secondary" size="sm" loading={loading} onClick={download} icon={<Download className="h-3.5 w-3.5" />}>
          Download CSV
        </Button>
      </PanelBody>
    </Panel>
  )
}
