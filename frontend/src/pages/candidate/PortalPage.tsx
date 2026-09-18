import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '../../components/kit/Badge'
import { Button } from '../../components/kit/Button'
import { Card } from '../../components/kit/Card'
import { EmptyState } from '../../components/kit/EmptyState'
import { Logo } from '../../components/kit/Logo'
import { PageSpinner } from '../../components/kit/Spinner'
import { candidatePortalApi, extractErrorMessage } from '../../core/api'
import { useAuth } from '../../core/auth'
import { useToast } from '../../core/toast'
import type { Application, CompanyOut, JD } from '../../core/types'

const STATUS_MESSAGE: Record<string, { text: string; tone: 'info' | 'success' }> = {
  rejected: { text: 'Thank you for applying — you have not been shortlisted for this role.', tone: 'info' },
  declined: { text: 'You opted out of the interview process.', tone: 'info' },
  evaluated: { text: 'Your interview is complete and under review by the hiring team.', tone: 'info' },
  uploaded: { text: 'Your application is under review.', tone: 'info' },
  borderline: { text: "You've been shortlisted! The hiring team will email you an interview link soon.", tone: 'success' },
  shortlisted: { text: "You've been shortlisted! The hiring team will email you an interview link soon.", tone: 'success' },
  ready_to_call: { text: 'You are shortlisted for a virtual interview — check your mail!', tone: 'success' },
  called: { text: 'Your interview call is complete and is being processed.', tone: 'info' },
}
const DEFAULT_STATUS_MESSAGE = { text: 'Your application is under review.', tone: 'info' as const }

function statusMessage(status: string) {
  return STATUS_MESSAGE[status] ?? DEFAULT_STATUS_MESSAGE
}

export default function PortalPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [companies, setCompanies] = useState<CompanyOut[] | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [jds, setJds] = useState<JD[]>([])
  const [applications, setApplications] = useState<Application[] | null>(null)
  const [tab, setTab] = useState<'jobs' | 'applications'>('jobs')

  useEffect(() => {
    candidatePortalApi.companies().then(setCompanies)
    refreshApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedCompanyId) return
    candidatePortalApi.companyJds(selectedCompanyId).then(setJds)
  }, [selectedCompanyId])

  function refreshApplications() {
    candidatePortalApi
      .myApplications()
      .then(setApplications)
      .catch((err) => toast.show(extractErrorMessage(err), 'error'))
  }

  const firstName = session?.displayName.split(' ')[0].split('@')[0] ?? ''
  const initial = firstName[0]?.toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-semibold text-slate-900">RecruitAI</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white">
                {initial}
              </div>
              <span className="text-sm font-medium text-slate-700">{firstName}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                logout()
                navigate('/login', { replace: true })
              }}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="text-center">
          <p className="font-display text-xl font-semibold text-slate-900">Find your next role, powered by AI</p>
          <p className="mt-1.5 text-sm text-slate-500">
            Browse open roles from every company on RecruitAI and apply in a couple of clicks.
          </p>
        </div>

        {companies === null ? (
          <PageSpinner />
        ) : companies.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="No companies have signed up yet" description="Check back later." />
          </div>
        ) : (
          <>
            <div className="mt-8 flex justify-center">
              <CompanyDropdown
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onSelect={setSelectedCompanyId}
              />
            </div>

            <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ['jobs', 'Open roles', selectedCompanyId ? jds.length : null],
                  ['applications', 'My applications', applications?.length ?? null],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    tab === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                  {count != null && count > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{count}</span>}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === 'jobs' ? (
                selectedCompanyId ? (
                  <OpenRolesTab jds={jds} onApplied={refreshApplications} />
                ) : (
                  <EmptyState title="Select a company" description="Choose a company above to see its open roles." />
                )
              ) : (
                <ApplicationsTab applications={applications} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CompanyDropdown({
  companies,
  selectedCompanyId,
  onSelect,
}: {
  companies: CompanyOut[]
  selectedCompanyId: string | null
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = companies.find((c) => c.company_id === selectedCompanyId) ?? null

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-card transition-colors hover:border-slate-300"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? selected.company_name : 'Select a company'}
        </span>
        <ChevronIcon className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lifted">
          {companies.map((c) => (
            <button
              key={c.company_id}
              onClick={() => {
                onSelect(c.company_id)
                setOpen(false)
              }}
              className={`flex w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                c.company_id === selectedCompanyId ? 'font-semibold text-brand-700' : 'text-slate-600'
              }`}
            >
              {c.company_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OpenRolesTab({ jds, onApplied }: { jds: JD[]; onApplied: () => void }) {
  if (jds.length === 0) {
    return <EmptyState title="No open roles from this company yet" />
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {jds.map((jd) => (
        <JobCard key={jd.jd_id} jd={jd} onApplied={onApplied} />
      ))}
    </div>
  )
}

function JobCard({ jd, onApplied }: { jd: JD; onApplied: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ text: string; tone: 'info' | 'success' } | null>(null)

  async function apply() {
    if (!file) {
      toast.show('Upload your resume first.', 'error')
      return
    }
    setLoading(true)
    try {
      const shortlist = await candidatePortalApi.apply(jd.jd_id, file)
      onApplied()
      if (shortlist.evaluated === 0 || shortlist.errors.length > 0) {
        setResult({ text: "We couldn't process your resume just now. Please try again in a moment.", tone: 'info' })
      } else {
        // shortlist.shortlisted/evaluated are counts across every candidate
        // ever evaluated for this JD, not this applicant's own outcome --
        // look up this candidate's actual status instead of inferring it
        // from those batch totals.
        const applications = await candidatePortalApi.myApplications()
        const mine = applications.find((a) => a.jd_id === jd.jd_id)
        setResult(statusMessage(mine?.status ?? 'uploaded'))
      }
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card padded={false} className="flex flex-col overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-semibold text-slate-900">{jd.title}</span>
        <ChevronIcon className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="whitespace-pre-wrap text-sm text-slate-600">{jd.jd_text}</p>

          {(jd.must_have_skills || !!jd.min_experience) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {jd.must_have_skills
                ?.split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((skill) => (
                  <Badge key={skill} tone="indigo">
                    {skill}
                  </Badge>
                ))}
              {!!jd.min_experience && <Badge tone="slate">{jd.min_experience}+ yrs experience</Badge>}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center text-sm font-medium text-slate-600 transition-colors hover:border-brand-400 hover:bg-brand-50/50">
              {file ? file.name : 'Upload your resume (PDF or DOCX)'}
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button loading={loading} onClick={apply} className="w-full">
              Submit application
            </Button>
            {result && (
              <p
                className={`rounded-xl px-3.5 py-2.5 text-sm ${
                  result.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {result.text}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function ApplicationsTab({ applications }: { applications: Application[] | null }) {
  if (applications === null) return <PageSpinner />
  if (applications.length === 0) {
    return <EmptyState title="You haven't applied to anything yet" description="Check the 'Open roles' tab." />
  }
  return (
    <div className="space-y-3">
      {applications.map((app) => {
        const msg = statusMessage(app.status)
        return (
          <div key={app.candidate_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-slate-900">
                {app.jd_title} <span className="font-normal text-slate-400">— {app.company_name}</span>
              </p>
              {app.match_score != null && (
                <Badge tone={msg.tone === 'success' ? 'emerald' : 'slate'}>Score {Math.round(app.match_score)}</Badge>
              )}
            </div>
            <p
              className={`mt-2.5 rounded-xl px-3.5 py-2.5 text-sm ${
                msg.tone === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {msg.text}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
