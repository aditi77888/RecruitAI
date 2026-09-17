import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/kit/Button'
import { EmptyState } from '../../components/kit/EmptyState'
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
}
const DEFAULT_STATUS_MESSAGE = { text: 'You are shortlisted for a virtual interview — check your mail!', tone: 'success' as const }

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
    candidatePortalApi.companies().then((list) => {
      setCompanies(list)
      if (list.length > 0) setSelectedCompanyId(list[0].company_id)
    })
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg font-bold text-white">
            R
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">RecruitAI</h1>
          <p className="mt-1 text-sm text-slate-500">Find your next role, powered by AI</p>
          <p className="mt-3 text-sm text-slate-500">
            Logged in as <span className="font-semibold text-slate-700">{firstName}</span>
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
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {companies.map((c) => (
                <button
                  key={c.company_id}
                  onClick={() => setSelectedCompanyId(c.company_id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedCompanyId === c.company_id
                      ? 'bg-brand-600 text-white shadow-lifted'
                      : 'bg-white text-slate-600 shadow-card hover:bg-slate-100'
                  }`}
                >
                  {c.company_name}
                </button>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ['jobs', 'Open roles'],
                  ['applications', 'My applications'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    tab === value ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === 'jobs' ? (
                <OpenRolesTab jds={jds} onApplied={refreshApplications} />
              ) : (
                <ApplicationsTab applications={applications} />
              )}
            </div>
          </>
        )}

        <div className="mt-10 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            Log out
          </Button>
        </div>
      </div>
    </div>
  )
}

function OpenRolesTab({ jds, onApplied }: { jds: JD[]; onApplied: () => void }) {
  if (jds.length === 0) {
    return <EmptyState title="No open roles from this company yet" />
  }
  return (
    <div className="space-y-3">
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
      if (shortlist.evaluated === 0) {
        setResult({ text: "We couldn't process your resume just now. Please try again in a moment.", tone: 'info' })
      } else {
        setResult(statusMessage(shortlist.shortlisted > 0 ? 'shortlisted' : 'uploaded'))
      }
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
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
          {jd.must_have_skills && (
            <p className="mt-2 text-xs text-slate-400">Must-have skills: {jd.must_have_skills}</p>
          )}
          {!!jd.min_experience && <p className="text-xs text-slate-400">Minimum experience: {jd.min_experience} years</p>}

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
    </div>
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
            <p className="font-semibold text-slate-900">
              {app.jd_title} <span className="font-normal text-slate-400">— {app.company_name}</span>
            </p>
            <p
              className={`mt-2 rounded-xl px-3.5 py-2.5 text-sm ${
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
