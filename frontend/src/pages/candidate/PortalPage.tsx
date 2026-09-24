import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '../../components/kit/Badge'
import { Button } from '../../components/kit/Button'
import { Card } from '../../components/kit/Card'
import { EmptyState } from '../../components/kit/EmptyState'
import { Input } from '../../components/kit/Input'
import { Logo } from '../../components/kit/Logo'
import { PageSpinner, Spinner } from '../../components/kit/Spinner'
import { ScoreRing } from '../../components/kit/ScoreRing'
import { Stat } from '../../components/kit/Stat'
import { candidatePortalApi, extractErrorMessage } from '../../core/api'
import { useAuth } from '../../core/auth'
import { useToast } from '../../core/toast'
import type { Application, CompanyOut, JD } from '../../core/types'

// Resubmitting a different resume file for the same job creates a second
// application row server-side (candidate_id is keyed by resume content hash,
// not by candidate+job) -- collapse to one card per job here, keeping the
// newest (the API already returns applications most-recent-first).
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

// ---------------------------------------------------------------- Status model

type Tone = 'pending' | 'success' | 'error' | 'neutral'

interface StatusInfo {
  step: 1 | 2 | 3 | 4
  tone: Tone
  title: string
  description: string
}

const STEP_LABELS = ['Applied', 'Reviewed', 'Interview', 'Decision']

// How long a candidate's initial screening decision (shortlisted / borderline /
// rejected) stays hidden behind a generic "under process" message before the
// real outcome is revealed in "My applications".
const DECISION_REVEAL_DELAY_MS = 5 * 60 * 1000
const GATED_DECISION_STATUSES = new Set(['shortlisted', 'borderline', 'rejected'])

const STATUS_INFO: Record<string, StatusInfo> = {
  uploaded: {
    step: 1,
    tone: 'pending',
    title: 'Application submitted',
    description: 'Your resume has been received and is queued for review.',
  },
  awaiting_decision: {
    step: 1,
    tone: 'pending',
    title: 'Resume under process',
    description: "Your resume is under process — check 'My applications' after some time.",
  },
  shortlisted: {
    step: 2,
    tone: 'success',
    title: 'Keep an eye on your mail',
    description: "Keep an eye on your mail — you'll be notified there.",
  },
  borderline: {
    step: 2,
    tone: 'success',
    title: 'Keep an eye on your mail',
    description: "Keep an eye on your mail — you'll be notified there.",
  },
  rejected: {
    step: 2,
    tone: 'error',
    title: 'Not shortlisted',
    description: 'You have not been shortlisted for this specific role.',
  },
  declined: {
    step: 2,
    tone: 'neutral',
    title: 'Declined',
    description: 'You opted out of the interview process for this role.',
  },
  interview_context_processing: {
    step: 3,
    tone: 'pending',
    title: 'Preparing your interview',
    description: 'The hiring team is setting up your interview context.',
  },
  interview_context_error: {
    step: 3,
    tone: 'error',
    title: 'Setup issue',
    description: 'We hit an issue preparing your interview. The hiring team has been notified.',
  },
  ready_to_call: {
    step: 3,
    tone: 'success',
    title: 'Interview scheduled',
    description: 'You are shortlisted for a virtual interview — check your email for the link.',
  },
  reschedule_requested: {
    step: 3,
    tone: 'pending',
    title: 'Reschedule requested',
    description: 'A new interview time is being arranged for you.',
  },
  called: {
    step: 4,
    tone: 'pending',
    title: 'Interview completed',
    description: 'Your interview call is complete and is being processed.',
  },
  call_disconnected: {
    step: 3,
    tone: 'pending',
    title: 'Call disconnected',
    description: 'Your call was disconnected — a new attempt will be scheduled.',
  },
  evaluated: {
    step: 4,
    tone: 'success',
    title: 'Review complete',
    description: 'Your interview has been evaluated and is under review by the hiring team.',
  },
  __eval_failed__: {
    step: 1,
    tone: 'neutral',
    title: "Couldn't process your resume",
    description: 'Please try uploading it again in a moment.',
  },
}
const DEFAULT_STATUS_INFO: StatusInfo = {
  step: 1,
  tone: 'pending',
  title: 'Under review',
  description: 'Your application is being processed.',
}

function statusInfo(status: string): StatusInfo {
  return STATUS_INFO[status] ?? DEFAULT_STATUS_INFO
}

// The screening pipeline actually runs (and sets the real status) synchronously
// during upload, but we don't want to reveal shortlisted/rejected to the
// candidate right away -- hold it behind a generic "under process" message
// until DECISION_REVEAL_DELAY_MS has passed since they applied.
function displayStatusInfo(status: string, createdAt: string | null | undefined): StatusInfo {
  if (GATED_DECISION_STATUSES.has(status) && createdAt) {
    const appliedAt = new Date(createdAt).getTime()
    if (!Number.isNaN(appliedAt) && Date.now() - appliedAt < DECISION_REVEAL_DELAY_MS) {
      return STATUS_INFO.awaiting_decision
    }
  }
  return statusInfo(status)
}

const TONE_DOT: Record<Tone, string> = {
  pending: 'bg-brand-500',
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  neutral: 'bg-slate-400',
}
const TONE_PANEL: Record<Tone, string> = {
  pending: 'bg-brand-50 text-brand-800',
  success: 'bg-emerald-50 text-emerald-800',
  error: 'bg-rose-50 text-rose-800',
  neutral: 'bg-slate-100 text-slate-600',
}

function StatusPanel({ status, createdAt }: { status: string; createdAt?: string | null }) {
  const info = displayStatusInfo(status, createdAt)
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ${TONE_PANEL[info.tone]}`}>
      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[info.tone]}`} />
      <span>
        <span className="font-semibold">{info.title}.</span> {info.description}
      </span>
    </div>
  )
}

function StatusTimeline({ status, createdAt }: { status: string; createdAt?: string | null }) {
  const info = displayStatusInfo(status, createdAt)
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1
        const isCurrent = stepNum === info.step
        const isDone = stepNum < info.step
        const dotClasses = isCurrent
          ? `${TONE_DOT[info.tone]} ring-4 ${
              info.tone === 'success'
                ? 'ring-emerald-100'
                : info.tone === 'error'
                  ? 'ring-rose-100'
                  : info.tone === 'neutral'
                    ? 'ring-slate-100'
                    : 'ring-brand-100'
            }`
          : isDone
            ? 'bg-brand-500'
            : 'bg-slate-200'
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${dotClasses}`} />
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${
                  isCurrent ? 'text-slate-700' : isDone ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
            {stepNum < STEP_LABELS.length && (
              <div className={`mx-1.5 mb-4 h-0.5 flex-1 rounded-full ${isDone ? 'bg-brand-500' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- Page

export default function PortalPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [companies, setCompanies] = useState<CompanyOut[] | null>(null)
  const [jdsByCompany, setJdsByCompany] = useState<Record<string, JD[]> | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[] | null>(null)
  const [topTab, setTopTab] = useState<'browse' | 'applications'>('browse')
  const [companyTab, setCompanyTab] = useState<'jobs' | 'applications'>('jobs')
  const [search, setSearch] = useState('')

  useEffect(() => {
    candidatePortalApi
      .companies()
      .then(setCompanies)
      .catch((err) => toast.show(extractErrorMessage(err), 'error'))
    // A returning candidate should land straight on their applications --
    // company/role for each is shown right there -- rather than on the
    // "browse companies" tab, which only matters before they've applied.
    candidatePortalApi
      .myApplications()
      .then((apps) => {
        const deduped = dedupeByJd(apps)
        setApplications(deduped)
        if (deduped.length > 0) setTopTab('applications')
      })
      .catch((err) => toast.show(extractErrorMessage(err), 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!companies) return
    let cancelled = false
    Promise.all(
      companies.map((c) =>
        candidatePortalApi
          .companyJds(c.company_id)
          .then((jds) => [c.company_id, jds] as const)
          .catch(() => [c.company_id, [] as JD[]] as const),
      ),
    ).then((entries) => {
      if (!cancelled) setJdsByCompany(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [companies])

  function refreshApplications() {
    candidatePortalApi
      .myApplications()
      .then((apps) => setApplications(dedupeByJd(apps)))
      .catch((err) => toast.show(extractErrorMessage(err), 'error'))
  }

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
  const jdsForSelected = selectedCompanyId ? (jdsByCompany?.[selectedCompanyId] ?? []) : []
  const appsForSelected = selectedCompanyId ? (applicationsByCompany[selectedCompanyId] ?? []) : []

  const firstName = session?.displayName.split(' ')[0].split('@')[0] ?? ''
  const initial = firstName[0]?.toUpperCase() ?? '?'

  const totalApplications = applications?.length ?? 0
  const shortlistedCount =
    applications?.filter((a) => ['shortlisted', 'borderline', 'ready_to_call', 'called', 'evaluated'].includes(a.status))
      .length ?? 0
  const interviewCount = applications?.filter((a) => ['ready_to_call', 'called', 'evaluated'].includes(a.status)).length ?? 0

  function openCompany(id: string) {
    setSelectedCompanyId(id)
    setCompanyTab('jobs')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
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

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 px-6 py-10 text-center shadow-lifted sm:px-10">
          <SparkleIcon className="absolute -right-4 -top-4 h-28 w-28 text-white/10" />
          <SparkleIcon className="absolute bottom-2 left-6 h-14 w-14 text-white/10" />
          <p className="relative font-display text-2xl font-bold text-white sm:text-3xl">
            {firstName ? `Hey ${firstName}, find your next role` : 'Find your next role, powered by AI'}
          </p>
          <p className="relative mx-auto mt-1.5 max-w-md text-sm text-brand-50/90">
            Browse open roles from every company on RecruitAI and apply in a couple of clicks.
          </p>
        </div>

        {totalApplications > 0 && (
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Applications" value={totalApplications} icon={<DocumentIcon className="h-5 w-5" />} tone="brand" />
            <Stat label="Shortlisted" value={shortlistedCount} icon={<StarIcon className="h-5 w-5" />} tone="accent" />
            <Stat label="Interviews" value={interviewCount} icon={<PhoneIcon className="h-5 w-5" />} tone="emerald" />
          </div>
        )}

        <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              ['browse', 'Companies', companies?.length ?? null],
              ['applications', 'My applications', totalApplications || null],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              onClick={() => setTopTab(value)}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                topTab === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
              {count != null && count > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{count}</span>}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {topTab === 'applications' ? (
            <ApplicationsOverview applications={applications} />
          ) : companies === null ? (
            <PageSpinner />
          ) : companies.length === 0 ? (
            <EmptyState
              icon={<BuildingIcon className="h-5 w-5" />}
              title="No companies have signed up yet"
              description="Check back later."
            />
          ) : selectedCompany ? (
            <CompanyDetail
              company={selectedCompany}
              jds={jdsForSelected}
              jdsLoading={jdsByCompany === null}
              applications={appsForSelected}
              tab={companyTab}
              onTabChange={setCompanyTab}
              onBack={() => setSelectedCompanyId(null)}
              onApplied={refreshApplications}
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
  jdsByCompany: Record<string, JD[]> | null
  applicationsByCompany: Record<string, Application[]>
  search: string
  onSearchChange: (v: string) => void
  onSelect: (id: string) => void
}) {
  const filtered = companies.filter((c) => c.company_name.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div>
      {companies.length > 4 && (
        <div className="mx-auto mb-6 max-w-sm">
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="No companies match your search" description="Try a different name." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CompanyCard
              key={c.company_id}
              company={c}
              roleCount={jdsByCompany?.[c.company_id]?.length ?? null}
              appCount={applicationsByCompany[c.company_id]?.length ?? 0}
              onClick={() => onSelect(c.company_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CompanyCard({
  company,
  roleCount,
  appCount,
  onClick,
}: {
  company: CompanyOut
  roleCount: number | null
  appCount: number
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className="flex h-full flex-col gap-3 transition-transform duration-150 hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-base font-bold text-white">
            {company.company_name.trim()[0]?.toUpperCase() ?? '?'}
          </div>
          {appCount > 0 && <Badge tone="indigo">{appCount === 1 ? 'Applied' : `${appCount} applications`}</Badge>}
        </div>
        <div>
          <h3 className="truncate font-semibold text-slate-900">{company.company_name}</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {roleCount === null ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner className="h-3 w-3" /> Loading roles...
              </span>
            ) : roleCount === 0 ? (
              'No open roles right now'
            ) : (
              `${roleCount} open role${roleCount === 1 ? '' : 's'}`
            )}
          </p>
        </div>
        <div className="mt-auto flex items-center gap-1 pt-1 text-sm font-medium text-brand-600">
          View roles
          <ChevronRightIcon className="h-4 w-4" />
        </div>
      </Card>
    </button>
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
  onApplied,
  allApplications,
}: {
  company: CompanyOut
  jds: JD[]
  jdsLoading: boolean
  applications: Application[]
  tab: 'jobs' | 'applications'
  onTabChange: (t: 'jobs' | 'applications') => void
  onBack: () => void
  onApplied: () => void
  allApplications: Application[] | null
}) {
  return (
    <div className="animate-fade-in-up">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        All companies
      </button>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-xl font-bold text-white shadow-lifted">
          {company.company_name.trim()[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">{company.company_name}</h2>
          <p className="text-sm text-slate-500">
            {jdsLoading ? 'Loading open roles...' : `${jds.length} open role${jds.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      <div className="mb-6 grid max-w-sm grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {(
          [
            ['jobs', 'Open roles', jds.length],
            ['applications', 'My applications', applications.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            onClick={() => onTabChange(value)}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              tab === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            {count > 0 && <span className="ml-1.5 text-xs font-normal text-slate-400">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'jobs' ? (
        jdsLoading ? (
          <PageSpinner />
        ) : jds.length === 0 ? (
          <EmptyState icon={<BriefcaseIcon className="h-5 w-5" />} title="No open roles from this company yet" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {jds.map((jd) => (
              <JobCard key={jd.jd_id} jd={jd} allApplications={allApplications} onApplied={onApplied} />
            ))}
          </div>
        )
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon className="h-5 w-5" />}
          title="No applications with this company yet"
          description="Apply to an open role to see your status here."
        />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard key={app.jd_id} app={app} showCompany={false} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Job description

// The recruiter's raw JD text has no guaranteed structure (typed free-form or
// extracted from a PDF/DOCX by the LLM parser), so we heuristically split it
// into headings/bullets/paragraphs for a readable "structured" view instead
// of dumping it as one pre-wrapped blob.
type JdBlock = { kind: 'heading'; text: string } | { kind: 'list'; items: string[] } | { kind: 'paragraph'; text: string }

const BULLET_LINE_RE = /^\s*(?:[-*•▪●]|\d+[.)])\s+(.+)/
const HEADING_LINE_RE = /^[A-Za-z][A-Za-z0-9 /&'-]{2,60}:$/

function parseJdBlocks(raw: string): JdBlock[] {
  const blocks: JdBlock[] = []
  let paragraphBuf: string[] = []
  let listBuf: string[] = []

  const flushParagraph = () => {
    if (paragraphBuf.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraphBuf.join(' ').trim() })
      paragraphBuf = []
    }
  }
  const flushList = () => {
    if (listBuf.length > 0) {
      blocks.push({ kind: 'list', items: listBuf })
      listBuf = []
    }
  }

  for (const rawLine of raw.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      continue
    }
    const bulletMatch = line.match(BULLET_LINE_RE)
    if (bulletMatch) {
      flushParagraph()
      listBuf.push(bulletMatch[1].trim())
      continue
    }
    flushList()
    if (HEADING_LINE_RE.test(line)) {
      flushParagraph()
      blocks.push({ kind: 'heading', text: line.replace(/:$/, '') })
      continue
    }
    paragraphBuf.push(line)
  }
  flushParagraph()
  flushList()
  return blocks
}

function splitSkills(csv: string | null): string[] {
  return csv?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
}

function SkillGroup({ label, tone, skills }: { label: string; tone: 'indigo' | 'sky'; skills: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {skills.map((skill) => (
        <Badge key={skill} tone={tone}>
          {skill}
        </Badge>
      ))}
    </div>
  )
}

function JobDescription({ jd }: { jd: JD }) {
  const blocks = useMemo(() => parseJdBlocks(jd.jd_text), [jd.jd_text])
  const mustHave = useMemo(() => splitSkills(jd.must_have_skills), [jd.must_have_skills])
  const niceToHave = useMemo(() => splitSkills(jd.nice_to_have_skills), [jd.nice_to_have_skills])

  return (
    <div className="space-y-4">
      {(mustHave.length > 0 || niceToHave.length > 0 || !!jd.min_experience) && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3.5">
          {mustHave.length > 0 && <SkillGroup label="Must have" tone="indigo" skills={mustHave} />}
          {niceToHave.length > 0 && <SkillGroup label="Nice to have" tone="sky" skills={niceToHave} />}
          {!!jd.min_experience && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <ClockIcon className="h-3.5 w-3.5" />
              {jd.min_experience}+ years of experience
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {blocks.map((block, i) =>
          block.kind === 'heading' ? (
            <h4 key={i} className="flex items-center gap-1.5 pt-1 text-sm font-semibold text-slate-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              {block.text}
            </h4>
          ) : block.kind === 'list' ? (
            <ul key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p key={i} className="text-sm leading-relaxed text-slate-600">
              {block.text}
            </p>
          ),
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Job card

function JobCard({
  jd,
  allApplications,
  onApplied,
}: {
  jd: JD
  allApplications: Application[] | null
  onApplied: () => void
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const existingApplication = allApplications?.find((a) => a.jd_id === jd.jd_id) ?? null

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
        setResult('__eval_failed__')
      } else {
        // Don't reveal the real screening outcome yet -- the candidate sees
        // a generic "under process" message until displayStatusInfo's reveal
        // delay has passed (checked against the real status in "My applications").
        setResult('awaiting_decision')
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
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <BriefcaseIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-semibold text-slate-900">{jd.title}</span>
            {existingApplication && !open && (
              <span className="text-xs font-medium text-brand-600">
                {displayStatusInfo(existingApplication.status, existingApplication.created_at).title}
              </span>
            )}
          </div>
        </div>
        <ChevronIcon className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4">
          <JobDescription jd={jd} />

          {existingApplication && !result && (
            <div className="mt-4">
              <StatusPanel status={existingApplication.status} createdAt={existingApplication.created_at} />
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
              {existingApplication ? 'Resubmit application' : 'Submit application'}
            </Button>
            {result && <StatusPanel status={result} />}
          </div>
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------- Applications

function ApplicationsOverview({ applications }: { applications: Application[] | null }) {
  if (applications === null) return <PageSpinner />
  if (applications.length === 0) {
    return (
      <EmptyState
        icon={<DocumentIcon className="h-5 w-5" />}
        title="You haven't applied to anything yet"
        description="Browse companies and open roles from the 'Companies' tab."
      />
    )
  }
  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <ApplicationCard key={`${app.jd_id}:${app.candidate_id}`} app={app} showCompany />
      ))}
    </div>
  )
}

function ApplicationCard({ app, showCompany }: { app: Application; showCompany: boolean }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{app.jd_title}</p>
          {showCompany && <p className="mt-0.5 text-sm text-slate-500">{app.company_name}</p>}
        </div>
        {app.match_score != null && <ScoreRing score={app.match_score} />}
      </div>

      <div className="mt-5">
        <StatusTimeline status={app.status} createdAt={app.created_at} />
      </div>

      <div className="mt-4">
        <StatusPanel status={app.status} createdAt={app.created_at} />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- Icons

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5m0 0 6-6m-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="m12 3 2.7 5.8 6.3.6-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2-4.7-4.3 6.3-.6z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M5 4h3l1.5 4.5L7.5 10a12 12 0 0 0 6.5 6.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2C10.5 21 3 13.5 3 6a2 2 0 0 1 2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c.5 4.2 2.3 6 6.5 6.5-4.2.5-6 2.3-6.5 6.5-.5-4.2-2.3-6-6.5-6.5C9.7 8 11.5 6.2 12 2Z" />
      <path d="M19 15c.3 2 1.1 2.9 3 3.2-1.9.3-2.7 1.1-3 3.1-.3-2-1.1-2.8-3-3.1 1.9-.3 2.7-1.2 3-3.2Z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
