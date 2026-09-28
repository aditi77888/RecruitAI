import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Briefcase, Building2, Check, Clock, FileText, LogOut, Sparkles } from 'lucide-react'

import { Button } from '../../components/kit/Button'
import { EmptyState, ErrorState } from '../../components/kit/EmptyState'
import { Input } from '../../components/kit/Input'
import { Logo, Wordmark } from '../../components/kit/Logo'
import { PageSpinner, Spinner } from '../../components/kit/Spinner'
import { ScoreRing } from '../../components/kit/ScoreIndicator'
import { TimelineHorizontal } from '../../components/kit/Timeline'
import { useApplyToJd, usePortalApplications, usePortalCompanies, usePortalJdsByCompany } from '../../hooks/usePortal'
import { useAuth } from '../../core/auth-context'
import { cn } from '../../core/cn'
import { extractErrorMessage } from '../../core/api-client'
import { parseJdBlocks, splitSkills } from '../../core/jd-parser'
import { displayStatusInfo, STEP_LABELS } from '../../core/portal-status'
import { useToast } from '../../core/toast-context'
import type { Application, CompanyOut, JD } from '../../core/types'

// Ported from the old frontend verbatim: resubmitting a different resume
// file for the same job creates a second application row server-side
// (candidate_id is keyed by resume content hash, not candidate+job) --
// collapse to one card per job here, keeping the newest.
function dedupeByJd(apps: Application[]): Application[] {
  const seen = new Set<string>()
  const result: Application[] = []
  for (const app of apps) {
    if (seen.has(app.jd_id)) continue
    seen.add(app.jd_id)
    result.push(app)
  }
  return result
}

function stepStateFor(currentStep: number, stepNum: number): 'done' | 'current' | 'upcoming' {
  if (stepNum === currentStep) return 'current'
  if (stepNum < currentStep) return 'done'
  return 'upcoming'
}

export default function PortalPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  const { data: companies, isError: companiesError, refetch: refetchCompanies } = usePortalCompanies()
  const {
    data: rawApplications,
    isError: applicationsError,
    refetch: refetchApplications,
  } = usePortalApplications()
  const applications = useMemo(() => (rawApplications ? dedupeByJd(rawApplications) : null), [rawApplications])

  const companyIds = useMemo(() => (companies ?? []).map((c) => c.company_id), [companies])
  const { byCompany: jdsByCompany, loading: jdsLoading } = usePortalJdsByCompany(companyIds)

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [topTab, setTopTab] = useState<'browse' | 'applications'>('browse')
  const [companyTab, setCompanyTab] = useState<'jobs' | 'applications'>('jobs')
  const [search, setSearch] = useState('')

  // A returning candidate should land on their applications (company/role
  // shown right there) rather than "browse companies", which only matters
  // before they've applied to anything -- but only auto-switch once, the
  // first time applications load, so it never fights a manual tab click.
  const hasAutoSwitched = useRef(false)
  useEffect(() => {
    if (hasAutoSwitched.current) return
    if (applications && applications.length > 0) {
      hasAutoSwitched.current = true
      setTopTab('applications')
    }
  }, [applications])

  const applicationsByCompany = useMemo(() => {
    const map: Record<string, Application[]> = {}
    for (const app of applications ?? []) {
      const key = app.company_id ?? ''
      if (!map[key]) map[key] = []
      map[key].push(app)
    }
    return map
  }, [applications])

  const selectedCompany = companies?.find((c) => c.company_id === selectedCompanyId) ?? null
  const jdsForSelected = selectedCompanyId ? (jdsByCompany[selectedCompanyId] ?? []) : []
  const appsForSelected = selectedCompanyId ? (applicationsByCompany[selectedCompanyId] ?? []) : []

  const firstName = session?.displayName.split(' ')[0].split('@')[0] ?? ''

  const totalApplications = applications?.length ?? 0
  const shortlistedCount =
    applications?.filter((a) => ['shortlisted', 'borderline', 'ready_to_call', 'called', 'evaluated'].includes(a.status)).length ?? 0
  const interviewCount = applications?.filter((a) => ['ready_to_call', 'called', 'evaluated'].includes(a.status)).length ?? 0

  function openCompany(id: string) {
    setSelectedCompanyId(id)
    setCompanyTab('jobs')
  }

  function selectTopTab(tab: 'browse' | 'applications') {
    hasAutoSwitched.current = true
    setTopTab(tab)
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <Wordmark />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[12.5px] font-medium text-text-secondary sm:inline">{firstName}</span>
            <Button
              variant="secondary"
              size="sm"
              icon={<LogOut className="h-3.5 w-3.5" />}
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

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="rounded-xl border border-border bg-surface px-6 py-8 text-center sm:px-10">
          <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <p className="font-display text-[21px] font-semibold text-text sm:text-[24px]">
            {firstName ? `Hey ${firstName}, find your next role` : 'Find your next role'}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-text-secondary">
            Browse open roles from every company on RecruitAI and apply in a couple of clicks.
          </p>
        </div>

        {totalApplications > 0 && (
          <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface">
            <PortalStat label="Applications" value={totalApplications} />
            <PortalStat label="Shortlisted" value={shortlistedCount} />
            <PortalStat label="Interviews" value={interviewCount} />
          </div>
        )}

        <div className="mx-auto mt-6 flex max-w-xs rounded-md border border-border bg-surface p-0.5">
          {(
            [
              ['browse', 'Companies', companies?.length ?? null],
              ['applications', 'My applications', totalApplications || null],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              onClick={() => selectTopTab(value)}
              className={cn(
                'flex-1 rounded-[5px] py-1.5 text-[12.5px] font-semibold transition-colors',
                topTab === value ? 'bg-text text-white' : 'text-text-secondary hover:text-text',
              )}
            >
              {label}
              {count != null && count > 0 && <span className="ml-1 text-[11px] font-normal opacity-70">{count}</span>}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {topTab === 'applications' ? (
            <ApplicationsOverview
              applications={applications}
              isError={applicationsError}
              onRetry={() => refetchApplications()}
            />
          ) : companiesError ? (
            <ErrorState
              title="Couldn't load companies"
              description="Something went wrong reaching the server. Check your connection and try again."
              onRetry={() => refetchCompanies()}
            />
          ) : companies === undefined ? (
            <PageSpinner />
          ) : companies.length === 0 ? (
            <EmptyState icon={<Building2 className="h-4.5 w-4.5" />} title="No companies have signed up yet" description="Check back later." />
          ) : selectedCompany ? (
            <CompanyDetail
              company={selectedCompany}
              jds={jdsForSelected}
              jdsLoading={jdsLoading}
              applications={appsForSelected}
              tab={companyTab}
              onTabChange={setCompanyTab}
              onBack={() => setSelectedCompanyId(null)}
              allApplications={applications}
            />
          ) : (
            <CompanyGrid
              companies={companies}
              jdsByCompany={jdsByCompany}
              applicationsByCompany={applicationsByCompany}
              search={search}
              onSearchChange={setSearch}
              onSelect={openCompany}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function PortalStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="font-display text-[18px] font-semibold tabular-nums text-text">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-text-tertiary">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------- Company grid

function CompanyGrid({
  companies,
  jdsByCompany,
  applicationsByCompany,
  search,
  onSearchChange,
  onSelect,
}: {
  companies: CompanyOut[]
  jdsByCompany: Record<string, JD[]>
  applicationsByCompany: Record<string, Application[]>
  search: string
  onSearchChange: (v: string) => void
  onSelect: (id: string) => void
}) {
  const filtered = companies.filter((c) => c.company_name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div>
      {companies.length > 4 && (
        <div className="mx-auto mb-5 max-w-sm">
          <Input placeholder="Search companies..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="No companies match your search" description="Try a different name." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <button key={c.company_id} onClick={() => onSelect(c.company_id)} className="text-left">
              <div className="flex h-full flex-col gap-2.5 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-[13px] font-bold text-white">
                    {c.company_name.trim()[0]?.toUpperCase() ?? '?'}
                  </div>
                  {(applicationsByCompany[c.company_id]?.length ?? 0) > 0 && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                      Applied
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="truncate text-[13.5px] font-semibold text-text">{c.company_name}</h3>
                  <p className="mt-0.5 text-[12px] text-text-secondary">
                    {jdsByCompany[c.company_id] === undefined ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Spinner className="h-3 w-3" /> Loading roles...
                      </span>
                    ) : jdsByCompany[c.company_id].length === 0 ? (
                      'No open roles right now'
                    ) : (
                      `${jdsByCompany[c.company_id].length} open role${jdsByCompany[c.company_id].length === 1 ? '' : 's'}`
                    )}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-1 pt-0.5 text-[12.5px] font-medium text-accent">
                  View roles <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Company detail

function CompanyDetail({
  company,
  jds,
  jdsLoading,
  applications,
  tab,
  onTabChange,
  onBack,
  allApplications,
}: {
  company: CompanyOut
  jds: JD[]
  jdsLoading: boolean
  applications: Application[]
  tab: 'jobs' | 'applications'
  onTabChange: (t: 'jobs' | 'applications') => void
  onBack: () => void
  allApplications: Application[] | null
}) {
  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" />
        All companies
      </button>

      <div className="mb-5 flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink text-[16px] font-bold text-white">
          {company.company_name.trim()[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <h2 className="font-display text-[17px] font-semibold text-text">{company.company_name}</h2>
          <p className="text-[12.5px] text-text-secondary">
            {jdsLoading ? 'Loading open roles...' : `${jds.length} open role${jds.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      <div className="mb-5 flex max-w-xs rounded-md border border-border bg-surface p-0.5">
        {(
          [
            ['jobs', 'Open roles', jds.length],
            ['applications', 'My applications', applications.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            onClick={() => onTabChange(value)}
            className={cn(
              'flex-1 rounded-[5px] py-1.5 text-[12.5px] font-semibold transition-colors',
              tab === value ? 'bg-text text-white' : 'text-text-secondary hover:text-text',
            )}
          >
            {label}
            {count > 0 && <span className="ml-1 text-[11px] font-normal opacity-70">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'jobs' ? (
        jdsLoading ? (
          <PageSpinner />
        ) : jds.length === 0 ? (
          <EmptyState icon={<Briefcase className="h-4.5 w-4.5" />} title="No open roles from this company yet" />
        ) : (
          <div className="space-y-3">
            {jds.map((jd) => (
              <JobCard key={jd.jd_id} jd={jd} allApplications={allApplications} />
            ))}
          </div>
        )
      ) : applications.length === 0 ? (
        <EmptyState icon={<FileText className="h-4.5 w-4.5" />} title="No applications with this company yet" description="Apply to an open role to see your status here." />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard key={app.jd_id} app={app} showCompany={false} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Job description

function JobDescription({ jd }: { jd: JD }) {
  const blocks = useMemo(() => parseJdBlocks(jd.jd_text), [jd.jd_text])
  const mustHave = useMemo(() => splitSkills(jd.must_have_skills), [jd.must_have_skills])
  const niceToHave = useMemo(() => splitSkills(jd.nice_to_have_skills), [jd.nice_to_have_skills])

  return (
    <div className="space-y-3.5">
      {(mustHave.length > 0 || niceToHave.length > 0 || !!jd.min_experience) && (
        <div className="space-y-2 rounded-md bg-surface-sunken p-3">
          {mustHave.length > 0 && <SkillGroup label="Must have" skills={mustHave} accent />}
          {niceToHave.length > 0 && <SkillGroup label="Nice to have" skills={niceToHave} />}
          {!!jd.min_experience && (
            <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-text-secondary">
              <Clock className="h-3.5 w-3.5" />
              {jd.min_experience}+ years of experience
            </div>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        {blocks.map((block, i) =>
          block.kind === 'heading' ? (
            <h4 key={i} className="pt-1 text-[13px] font-semibold text-text">
              {block.text}
            </h4>
          ) : block.kind === 'list' ? (
            <ul key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-[12.5px] text-text-secondary">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p key={i} className="text-[12.5px] leading-relaxed text-text-secondary">
              {block.text}
            </p>
          ),
        )}
      </div>
    </div>
  )
}

function SkillGroup({ label, skills, accent }: { label: string; skills: string[]; accent?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-tertiary">{label}</span>
      {skills.map((skill) => (
        <span
          key={skill}
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium',
            accent ? 'bg-accent-soft text-accent' : 'bg-surface text-text-secondary',
          )}
        >
          {skill}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- Job card

function JobCard({ jd, allApplications }: { jd: JD; allApplications: Application[] | null }) {
  const toast = useToast()
  const applyMutation = useApplyToJd()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<string | null>(null)
  // Tracks the exact file (by name+size) already successfully submitted for
  // THIS job in this session -- resubmitting a different file is a real,
  // supported flow (see dedupeByJd above), so this only warns rather than
  // blocking: the backend's own hash-based dedup (phase0/checkpoint.py)
  // already guarantees re-screening never happens for identical content.
  const lastSubmittedRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingApplication = allApplications?.find((a) => a.jd_id === jd.jd_id) ?? null

  function onFileSelected(selected: File | null) {
    setFile(selected)
    if (selected && lastSubmittedRef.current === `${selected.name}:${selected.size}`) {
      toast.show(`You already submitted "${selected.name}" for this role — it won't be screened twice.`, 'info')
    }
  }

  async function apply() {
    if (!file) {
      toast.show('Upload your resume first.', 'error')
      return
    }
    try {
      const shortlist = await applyMutation.mutateAsync({ jdId: jd.jd_id, resume: file })
      lastSubmittedRef.current = `${file.name}:${file.size}`
      if (shortlist.evaluated === 0 || shortlist.errors.length > 0) {
        setResult('__eval_failed__')
        toast.show("Couldn't process your resume. Please try again in a moment.", 'error')
      } else {
        // Don't reveal the real screening outcome yet -- displayStatusInfo
        // holds it behind "under process" until its reveal delay has passed.
        setResult('awaiting_decision')
        toast.show('Application submitted.', 'success')
      }
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Briefcase className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-[13.5px] font-semibold text-text">{jd.title}</span>
            {existingApplication && !open && (
              <span className="text-[12px] font-medium text-accent">
                {displayStatusInfo(existingApplication.status, existingApplication.created_at).title}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className={cn('h-4 w-4 shrink-0 text-text-tertiary transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4">
          <JobDescription jd={jd} />

          {existingApplication && !result && (
            <div className="mt-4">
              <StatusPanel status={existingApplication.status} createdAt={existingApplication.created_at} />
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            <label
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-surface-sunken px-3 py-3 text-center text-[12.5px] font-medium text-text-secondary transition-colors hover:border-accent hover:bg-accent-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {file ? file.name : 'Upload your resume (PDF or DOCX)'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button loading={applyMutation.isPending} onClick={apply} className="w-full">
              {existingApplication ? 'Resubmit application' : 'Submit application'}
            </Button>
            {result && <StatusPanel status={result} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Applications

function ApplicationsOverview({
  applications,
  isError,
  onRetry,
}: {
  applications: Application[] | null
  isError: boolean
  onRetry: () => void
}) {
  if (isError) {
    return (
      <ErrorState
        title="Couldn't load your applications"
        description="Something went wrong reaching the server. Check your connection and try again."
        onRetry={onRetry}
      />
    )
  }
  if (applications === null) return <PageSpinner />
  if (applications.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-4.5 w-4.5" />}
        title="You haven't applied to anything yet"
        description="Browse companies and open roles from the 'Companies' tab."
      />
    )
  }
  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <ApplicationCard key={`${app.jd_id}:${app.candidate_id}`} app={app} showCompany />
      ))}
    </div>
  )
}

function ApplicationCard({ app, showCompany }: { app: Application; showCompany: boolean }) {
  const info = displayStatusInfo(app.status, app.created_at)
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-text">{app.jd_title}</p>
          {showCompany && <p className="mt-0.5 text-[12px] text-text-secondary">{app.company_name}</p>}
        </div>
        {app.match_score != null && <ScoreRing score={app.match_score} />}
      </div>

      <div className="mt-4">
        <TimelineHorizontal
          steps={STEP_LABELS.map((label, i) => ({ label, state: stepStateFor(info.step, i + 1) }))}
        />
      </div>

      <div className="mt-3">
        <StatusPanel status={app.status} createdAt={app.created_at} />
      </div>
    </div>
  )
}

function StatusPanel({ status, createdAt }: { status: string; createdAt?: string | null }) {
  const info = displayStatusInfo(status, createdAt)
  const toneStyles: Record<typeof info.tone, string> = {
    pending: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    error: 'bg-danger-soft text-danger',
    neutral: 'bg-surface-sunken text-text-secondary',
  }
  const dotStyles: Record<typeof info.tone, string> = {
    pending: 'bg-accent',
    success: 'bg-success',
    error: 'bg-danger',
    neutral: 'bg-text-tertiary',
  }
  return (
    <div className={cn('flex items-start gap-2.5 rounded-md px-3 py-2.5 text-[12.5px]', toneStyles[info.tone])}>
      <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', dotStyles[info.tone])} />
      <span>
        <span className="font-semibold">{info.title}.</span> {info.description}
      </span>
    </div>
  )
}
